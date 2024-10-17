import express from 'express';
import Cart from '../models/cart.models.js'; 
import Product from '../models/product.models.js'; 
import CartController from '../controller/cart.controller.js';

const router = express.Router();

let io;

export const configureIO = (socketIOInstance) => {
    io = socketIOInstance;
};

// Función para configurar los sockets para el carrito
export const configureCartIO = (io) => {
    io.on('connection', (socket) => {
        console.log('Nuevo cliente conectado al carrito');
        socket.on('addCart', (cart) => {
            console.log('Nuevo carrito agregado:', cart);
            io.emit('cartAdded', cart); 
        });

        socket.on('disconnect', () => {
            console.log('Cliente desconectado del carrito');
        });
    });
};

// GET general (Lo hice a modo de prueba)
router.get('/', async (req, res) => {
    try {
        const carts = await Cart.find();
        res.status(200).json({
            message: 'Lista de carritos',
            carts,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los carritos', error });
    }
});

// POST para crear un carrito
router.post('/', async (req, res) => {
    const { product, quantity } = req.body;

    if (!product || !quantity) {
        return res.status(400).json({ message: 'Los campos product y quantity son obligatorios.' });
    }

    const newCart = new Cart({
        products: [{ product, quantity }],
    });

    try {
        await newCart.save();

        if (io) {
            io.emit('cartCreated', newCart);
        }

        res.status(201).json({
            message: 'Nuevo carrito creado',
            cart: newCart,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear el carrito', error });
    }
});

// GET para obtener los productos de un carrito por ID con populate
router.get('/:cid', async (req, res) => {
    const { cid } = req.params;

    try {
        const cart = await Cart.findById(cid).populate('products.product'); 

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        res.status(200).json({
            message: 'Productos en el carrito',
            products: cart.products, 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el carrito', error });
    }
});


// POST para agregar un producto a un carrito existente
router.post('/:cid/product/:pid', async (req, res) => {
    const { cid, pid } = req.params;

    try {
        const cart = await Cart.findById(cid);

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        const existingProduct = cart.products.find(p => p.product.toString() === pid);

        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            const productExists = await Product.findById(pid);
            if (!productExists) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }
            cart.products.push({ product: pid, quantity: 1 });
        }

        await cart.save();

        if (io) {
            io.emit('productAddedToCart', { cartId: cid, productId: pid, cart });
        }

        res.status(200).json({
            message: 'Producto agregado al carrito',
            cart,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al agregar el producto al carrito', error });
    }
});

// DELETE para un producto del carrito
router.delete('/products/:pid', async (req, res) => {
    const { pid } = req.params;

    try {
        const cart = await Cart.findOne({ 'products.product': pid });

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado o producto no presente' });
        }

        cart.products = cart.products.filter(p => p.product.toString() !== pid);

        await cart.save();

        res.status(200).json({ message: 'Producto eliminado del carrito', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar el producto del carrito', error });
    }
});

// PUT para ctualizar el carrito con un arreglo
router.put('/', async (req, res) => {
    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
        return res.status(400).json({ message: 'El arreglo de productos es obligatorio.' });
    }

    try {
        const cart = await Cart.findOne();

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        cart.products = products;
        await cart.save();

        res.status(200).json({ message: 'Carrito actualizado con los nuevos productos', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el carrito', error });
    }
});

// PUT para actualizar un producto
router.put('/products/:pid', async (req, res) => {
    const { pid } = req.params;
    const { quantity } = req.body;

    if (!quantity || isNaN(quantity)) {
        return res.status(400).json({ message: 'La cantidad es obligatoria y debe ser un número.' });
    }

    try {
        const cart = await Cart.findOne({ 'products.product': pid });

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado o producto no presente' });
        }

        const productToUpdate = cart.products.find(p => p.product.toString() === pid);
        productToUpdate.quantity = quantity;

        await cart.save();

        res.status(200).json({ message: 'Cantidad de producto actualizada', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la cantidad del producto', error });
    }
});

// DELETE para todos los productos del carrito
router.delete('/', async (req, res) => {
    try {
        const cart = await Cart.findOne();

        if (!cart) {
            return res.status(404).json({ message: 'Carrito no encontrado' });
        }

        cart.products = [];
        await cart.save();

        res.status(200).json({ message: 'Todos los productos eliminados del carrito', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar los productos del carrito', error });
    }
});

// Ruta para agregar producto al carrito
router.post('/:cid/product/:pid', CartController.addProductToCart);


export default router;
