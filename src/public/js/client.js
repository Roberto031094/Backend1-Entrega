document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', () => {
        const productId = button.getAttribute('data-id');
        fetch(`/api/carts/addProduct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        })
        .then(response => response.json())
        .then(data => console.log('Producto agregado al carrito:', data))
        .catch(error => console.error('Error al agregar producto al carrito:', error));
    });
  });
  