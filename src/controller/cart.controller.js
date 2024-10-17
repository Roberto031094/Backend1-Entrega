import Cart from '../models/cart.models.js';

const CartController = {
  async addProductToCart(req, res) {
    const { cartId, productId } = req.params;

    try {
      let cart = await Cart.findById(cartId);

      if (!cart) {
        cart = new Cart({
          products: [{ product: productId, quantity: 1 }],
        });
        await cart.save();
        return res.status(201).json(cart);
      }

      const productInCart = cart.products.find(
        (p) => p.product.toString() === productId
      );

      if (productInCart) {
        productInCart.quantity += 1;
      } else {
        cart.products.push({ product: productId, quantity: 1 });
      }

      await cart.save();
      return res.status(200).json(cart);
    } catch (error) {
      console.error('Error al agregar producto al carrito:', error);
      return res.status(500).json({ error: 'Error al agregar producto al carrito' });
    }
  },
};

export default CartController;
