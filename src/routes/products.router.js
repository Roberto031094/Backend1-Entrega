import express from 'express';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Product from '../models/product.models.js'; 

const router = express.Router();
let io;

// Conectar a MongoDB
mongoose.connect('mongodb+srv://rodriguezriosroberto:DPuo3KtDKopXqyUI@cluster0.jnja7.mongodb.net/', {})
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));

// Config del socket
export const configureIO = (socketServer) => {
  io = socketServer;

  io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
    
    socket.on('addProduct', async (newProduct) => {
      try {
        const product = new Product(newProduct);
        await product.save();

        const products = await Product.find();
        io.emit('productListUpdate', products);
      } catch (error) {
        console.error('Error al agregar el producto:', error);
      }
    });

    socket.on('deleteProduct', async (productId) => {
      try {
        await Product.findByIdAndDelete(productId);
        const products = await Product.find();
        io.emit('productListUpdate', products);
      } catch (error) {
        console.error('Error al eliminar el producto:', error);
      }
    });
  });
};

// GET de todos los productos con paginación, sort, query, etc
router.get('/', async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query, available } = req.query;
    const parsedLimit = parseInt(limit) || 10;
    const parsedPage = parseInt(page) || 1;

    let filter = {};
    if (query) {
      filter.category = { $regex: query, $options: 'i' };
    }
    if (available) {
      filter.stock = available === 'true' ? { $gt: 0 } : 0;
    }

    const pipeline = [
      { $match: filter },
      { $skip: (parsedPage - 1) * parsedLimit },
      { $limit: parsedLimit }
    ];

    if (sort === 'asc' || sort === 'desc') {
      const sortOrder = sort === 'asc' ? { price: 1 } : { price: -1 };
      pipeline.unshift({ $sort: sortOrder });
    }

    const products = await Product.aggregate(pipeline);
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / parsedLimit);

    const hasPrevPage = parsedPage > 1;
    const hasNextPage = parsedPage < totalPages;
    const prevPage = hasPrevPage ? parsedPage - 1 : null;
    const nextPage = hasNextPage ? parsedPage + 1 : null;

    const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
    const prevLink = hasPrevPage ? `${baseUrl}?limit=${parsedLimit}&page=${prevPage}&sort=${sort || ''}&query=${query || ''}&available=${available || ''}` : null;
    const nextLink = hasNextPage ? `${baseUrl}?limit=${parsedLimit}&page=${nextPage}&sort=${sort || ''}&query=${query || ''}&available=${available || ''}` : null;

    res.json({
      status: 'success',
      payload: products,
      totalPages,
      prevPage,
      nextPage,
      page: parsedPage,
      hasPrevPage,
      hasNextPage,
      prevLink,
      nextLink
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error al obtener productos',
      error
    });
  }
});

// GET de producto por ID
router.get('/:pid', async (req, res) => {
  try {
    const product = await Product.findById(req.params.pid);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el producto', error });
  }
});

// POST para agregar un producto
router.post('/', async (req, res) => {
  const { title, description, code, price, stock, category, thumbnails = [] } = req.body;

  if (!title || !description || !code || !price || !stock || !category) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios, excepto thumbnails.' });
  }

  const newProduct = new Product({
    title,
    description,
    code,
    price,
    stock,
    category,
    thumbnails,
  });

  try {
    await newProduct.save();
    res.status(201).json(newProduct);

    if (io) {
      const products = await Product.find();
      io.emit('productListUpdate', products);
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar producto', error });
  }
});

// PUT para actualizar un producto
router.put('/:pid', async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.pid, req.body, { new: true });
    if (updatedProduct) {
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el producto', error });
  }
});

// DELETE para eliminar un producto
router.delete('/:pid', async (req, res) => {
  const { pid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(pid)) {
    return res.status(400).json({ message: 'ID de producto inválido' });
  }

  try {
    const deletedProduct = await Product.findByIdAndDelete(pid);
    if (deletedProduct) {
      res.json(deletedProduct);

      if (io) {
        const products = await Product.find();
        io.emit('productListUpdate', products);
      }
    } else {
      res.status(404).json({ message: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el producto', error });
  }
});

export default router;

