const socket = io();

const addToCartButton = document.getElementById('add-to-cart-btn');

addToCartButton.addEventListener('click', () => {
  const cartId = addToCartButton.dataset.cartId;  
  const productId = addToCartButton.dataset.productId;  

  socket.emit('addProductToCart', { cartId, productId });
});

socket.on('cartUpdated', (cart) => {
  console.log('Carrito actualizado:', cart);
});
