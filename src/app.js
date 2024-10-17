import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { create } from 'express-handlebars';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import methodOverride from 'method-override';
import Product from './models/product.models.js';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de Handlebars
const hbs = create({
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  defaultLayout: 'main',
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use(methodOverride('_method'));

dotenv.config();

// URI de MongoDB
const URIConexion = process.env.URIMONGO;

// Conectar a MongoDB
mongoose.connect(URIConexion, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Rutas
import productsRouter from './routes/products.router.js';
import viewsRouter from './routes/views.router.js';
import cartsRouter, { configureIO as configureCartIO } from './routes/carts.router.js';

app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use('/', viewsRouter);

// Configuración del servidor HTTP y WebSockets
const httpServer = app.listen(8080, () => {
  console.log('Servidor escuchando en http://localhost:8080');
});

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
  },
});

export { io };

configureCartIO(io);

// Evento de conexión para websockets
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado');

  // Escuchar el evento 'addProduct'
  socket.on('addProduct', async (productData) => {
    try {
      const existingProduct = await Product.findOne({ code: productData.code });
      if (existingProduct) {
        console.error('El producto ya existe:', existingProduct);
        return; 
      }
      const newProduct = new Product(productData); 
      await newProduct.save();
      io.emit('productAdded', newProduct); 
    } catch (error) {
      console.error('Error al agregar el producto:', error);
    }
  });

  // Escuchar el evento 'deleteProduct'
  socket.on('deleteProduct', async (productId) => {
    try {
      await Product.findByIdAndDelete(productId);
      console.log(`Producto con ID ${productId} eliminado`);
      io.emit('productDeleted', productId); 
    } catch (error) {
      console.error('Error al eliminar producto:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

io.on('connection', (socket) => {
  console.log('Usuario conectado');

  socket.on('addProductToCart', async ({ cartId, productId }) => {
    try {
      const response = await fetch(`/api/carts/${cartId}/product/${productId}`, {
        method: 'POST',
      });
      const data = await response.json();
      socket.emit('cartUpdated', data);
    } catch (error) {
      console.error('Error al agregar al carrito:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});


// Ruta para eliminar productos
app.delete('/productos/:id', async (req, res) => {
  const productId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'ID de producto inválido' });
  }

  try {
    const deletedProduct = await Product.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    
    console.log(`Producto con ID ${productId} eliminado`);
    io.emit('productDeleted', productId);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    res.status(500).json({ message: 'Error al eliminar el producto' });
  }
});
