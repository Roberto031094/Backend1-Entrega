import express from 'express';
import Product from '../models/product.models.js';
import Cart from '../models/cart.models.js';
import { io } from '../app.js'; 

const router = express.Router();

// Ruta para la vista principal "/"
router.get('/', (req, res) => {
    res.render('index', { 
        title: 'Ver Lista de Productos',
    });
});

// Ruta para mostrar productos con paginación
router.get('/products', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10;
        const skip = (page - 1) * limit;

        const products = await Product.find()
            .limit(limit)
            .skip(skip)
            .lean(); 

        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('realTimeProducts', {
            products,
            page,
            totalPages,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages,
            prevPage: page - 1,
            nextPage: page + 1,
        });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).send('Error al obtener productos');
    }
});

// Ruta para agregar un producto con el formulario
router.post('/api/products/add', async (req, res) => {
    try {
        const { title, price, description, stock, code, category, thumbnails } = req.body;
        
        const newProduct = new Product({
            title,
            price,
            description,
            stock,
            code,
            category,
            thumbnails,
        });

        await newProduct.save();

        io.emit('productAdded', newProduct);

        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error al agregar producto:', error);
        res.status(500).send('Hubo un error al agregar el producto.');
    }
});

// Ruta para eliminar un producto
router.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).send('Producto no encontrado');
        }

        
        io.emit('productDeleted', id);

        res.status(200).send('Producto eliminado');
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).send('Hubo un error al eliminar el producto.');
    }
});

// Ruta para obtener los detalles de un producto específico
router.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).send('Producto no encontrado');
        }

        res.render('productDetail', { product }); 
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).send('Hubo un error al obtener el producto.');
    }
});

// Ruta para obtener y renderizar un carrito específico
router.get('/carts/:cid', async (req, res) => {
    const { cid } = req.params;

    try {
        const cart = await Cart.findById(cid).populate('products.product');

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        res.render('cartDetail', {
            cart: cart, 
            title: 'Detalles del Carrito',
        });
    } catch (error) {
        console.error('Error al obtener el carrito:', error);
        res.status(500).send('Hubo un error al obtener el carrito.');
    }
});


export default router;


