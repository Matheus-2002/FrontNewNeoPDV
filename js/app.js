let orderIdPosGlobal;

const dashTotalSales = document.getElementById('dash-total-sales');
const dashCounSales = document.getElementById('dash-count-sales')
const dashCountOpenOrder = document.getElementById('dash-open-orders')
const carouselOrder = document.getElementById('open-orders-carousel');
const listOfProducts = document.getElementById('home-products-list');
const btnNewOrderHomePage = document.getElementById('nova-venda-home-page');
document.getElementById('nova-venda-home-page')?.addEventListener('click', () => {
    renderNewOrderForm();
});
const API_URL = "http://localhost:8080";

async function sendStartOrder() {
    const number = document.getElementById('new-order-number').value;
    const customerName = document.getElementById('new-order-customer').value;
        
    const newOrder = {
        customer: customerName,
        ticket: number
    };

    createNewOrderGlobal(newOrder);
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function payAndClose() {
    
    await getApi("/order/close/"+orderIdPosGlobal)

    showToast("Venda finalizada com sucesso!");
    renderHome();
}

async function deleteProduct() {
    const id = document.getElementById('prod-id').value;
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        const idProduct = document.getElementById('prod-id').value;
        await deleteApi("/product/"+idProduct)
        document.getElementById('modal-product').classList.remove('active');
        renderHome();
        this.showToast("Produto excluído.");
    }
}

async function saveProduct(e) {
    e.preventDefault();

    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const value = parseFloat(document.getElementById('prod-price').value);
    const stock = parseInt(document.getElementById('prod-stock').value);
    const category = document.getElementById('prod-category').value;
    const codeBar = document.getElementById('prod-barcode').value;

    const productJson = {
        name: name,
        category: category,
        value: value,
        stock: stock,
        codebar: codeBar
    };

    // 🔥 AQUI ESTÁ A LÓGICA
    if(id && id.trim() !== '') {
        // UPDATE
        console.log("Entrou no If");
        await putApi("/product/update/" + id, productJson);
        this.showToast?.("Produto atualizado.");
    } else {
        // CREATE
        console.log("Entrou no else");
        console.log(JSON.stringify(productJson, null, 2));
        await postApi("/product/create", productJson);
        this.showToast?.("Produto criado.");
    }

    document.getElementById('modal-product').classList.remove('active');
    await renderStock();

    if(document.getElementById('view-home').classList.contains('active')) {
        initHomeScream();
    }
}

async function addToCart(prod) {
    const body = {
        productId:prod.id,
        quantity:1
    }
    await postApi("/order/add-item/"+orderIdPosGlobal, body);
    const orderNew = await getApi("/order/"+orderIdPosGlobal)
    console.log("Order new: "+orderNew.amount);
    console.log("Order Id: "+orderNew.id);
    document.getElementById('pos-cart-total').textContent = formatCurrency(orderNew.amount);
    renderCart(orderNew);
}

async function addToCartForId(prodId) {
    const prod = await getApi("/product/"+prodId);
    const body = {
        productId:prod.id,
        quantity:1
    }
    await postApi("/order/add-item/"+orderIdPosGlobal, body);
    const orderNew = await getApi("/order/"+orderIdPosGlobal)
    document.getElementById('pos-cart-total').textContent = formatCurrency(orderNew.amount);
    renderCart(orderNew);
}

async function subtractToCartForId(prodId) {
    const prod = await getApi("/product/"+prodId);
    const body = {
        productId:prod.id,
        quantity:1
    }
    await postApi("/order/sub-item/"+orderIdPosGlobal, body);
    const orderNew = await getApi("/order/"+orderIdPosGlobal)
    document.getElementById('pos-cart-total').textContent = formatCurrency(orderNew.amount);
    renderCart(orderNew);
}

async function renderProductPos(){

    const container = document.getElementById('pos-products-grid');
    container.innerHTML = '';
    const productsToRender = await getApi("/product/all-active");

    productsToRender.forEach(prod => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.innerHTML = `
                <img src="https://picsum.photos/seed/${prod.id}/180/120" class="product-img">
                <div class="product-name">${prod.name}</div>
                <div class="product-price">${this.formatCurrency(prod.value)}</div>
            `;
            item.onclick = () => addToCart(prod);
            container.appendChild(item);
        });
}

async function renderProductPosCategory(category, el){
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    let productsToRender;
    const container = document.getElementById('pos-products-grid');
    if(category === "Todos"){
        productsToRender = await getApi("/product/all-active");
    }else{

        productsToRender = await getApi("/product/all-active/"+category);
    }
    
    container.innerHTML = '';
    productsToRender.forEach(prod => {
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <img src="https://picsum.photos/seed/${prod.id}/180/120" class="product-img">
            <div class="product-name">${prod.name}</div>
            <div class="product-price">${formatCurrency(prod.value)}</div>
        `;
        item.onclick = () => addToCart(prod);
        container.appendChild(item);
    });
}

async function renderStock2() {
    const data = await getApi("/product/all-active");
    const tbody = document.querySelector('#stock-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    data.forEach(prod => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="https://picsum.photos/seed/${prod.id}/40/40" style="border-radius:8px; object-fit:cover;"></td>
            <td style="font-weight: 500;">${prod.name}</td>
            <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${prod.category}</span></td>
            <td>${formatCurrency(prod.value)}</td>
            <td style="${prod.stock < 10 ? 'color:var(--danger); font-weight:bold;' : 'font-weight:500;'}">${prod.stock}</td>
            <td>
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openProductModal('${prod.id}')">Editar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCart(data) {
    const list = document.getElementById('pos-cart-list');
    list.innerHTML = '';
    const dataCart = data.itemList;

    if(dataCart.length === 0) {
            list.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); margin-top: 50px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <i class="ph ph-shopping-cart" style="font-size: 40px; opacity: 0.3;"></i>
                Carrinho vazio
            </div>`;

            document.getElementById('pos-cart-total').textContent = formatCurrency(data.amount || 0);
        return;
    }

    dataCart.forEach(item => {
        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title">${item.productName}</div>
                <div class="cart-item-price">${formatCurrency(item.productPrice)} un</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="subtractToCartForId('${item.productId}')">-</button>
                <span style="font-weight: 600;">${item.quantity}</span>
                <button class="qty-btn" onclick="addToCartForId('${item.productId}')">+</button>
            </div>
            <div style="font-weight:700; margin-left: 15px; color: var(--primary);">${formatCurrency(item.amount)}</div>
        `;
        list.appendChild(el);
    });

    document.getElementById('pos-cart-total').textContent = formatCurrency(data.amount || 0);

    console.log("teste --> "+data.amount);
    
}



function renderNewOrderForm(){

    const view = document.getElementById('view-new-sale');
    if (view) {
        view.classList.add('active');
        
        setTimeout(() => {
            document.getElementById('new-order-customer')?.focus();
        }, 150);
    }
}

function renderHome(){

    document.getElementById('new-order-number').value = '';
    document.getElementById('new-order-customer').value = '';

    // remove active de todas as telas
    document.querySelectorAll('.view').forEach(el => 
        el.classList.remove('active')
    );

    // remove active dos botões
    document.querySelectorAll('.nav-btn').forEach(el => 
        el.classList.remove('active')
    );

    // ativa home
    document.getElementById('view-home')?.classList.add('active');

    // ativa botão Início
    document.querySelectorAll('.nav-btn')[0]?.classList.add('active');

    // opcional: recarrega dados do dashboard
    initHomeScream();
}

async function loadOrderToPos(data){

    loadOrder(data);
    renderCart(data);
    await renderProductPos();

    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    const view = document.getElementById('view-pos');
    if (view) {
        view.classList.add('active');
    }
}

function loadOrder(data){
    document.getElementById('pos-order-title').textContent = `Pedido #${data.ticket} ${data.status === 'closed' ? '(Finalizado)' : ''}`;
}

function buildCarouselOrder(openOrders) {
    carouselOrder.innerHTML = '';
    if (!openOrders || openOrders.length === 0) {
        carouselOrder.innerHTML = '<div style="padding: 20px; color: var(--text-muted); font-style: italic;">Nenhuma venda aberta.</div>';
        return;
    }

    openOrders.forEach(order => {
        const el = document.createElement('div');
        el.className = 'order-card';
        const rawDate = order.createdAt || order.createdDate;
        const dataFormatada = rawDate 
            ? rawDate.split('T')[0].split('-').reverse().join('/') 
            : '--/--/----';
            
        const horaFormatada = rawDate 
            ? rawDate.split('T')[1].slice(0, 5) 
            : '--:--';

        el.innerHTML = `
            <div class="order-header">
                <span>#${order.ticket || '---'}</span>
                <span style="font-size: 0.75rem; opacity: 0.8;">${dataFormatada} - ${horaFormatada}</span>
            </div>
            <div class="order-total">${formatCurrency(order.amount || 0)}</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:10px;">
                <i class="ph ph-package"></i> ${(order.itens || 0)} itens
            </div>
        `;

        el.onclick = () => carregarOrderPos(order.id);
        carouselOrder.appendChild(el);
    });
}

async function createNewOrderGlobal(data) {
    const response = await postApi("/order/start", data);
    const orderCreate = await getApi("/order/"+response.orderId);
    
    loadOrderToPos(orderCreate);
}

async function carregarOrderPos(orderId) {
    orderIdPosGlobal = orderId;
    const orderCreate = await getApi("/order/"+orderId);
    loadOrderToPos(orderCreate);           
}

function buildListProduct(listProduct){
    listOfProducts.innerHTML = '';
        listProduct.forEach(prod => {
            const el = document.createElement('div');
            el.className = 'product-item';
            el.innerHTML = `
                <img src="https://picsum.photos/seed/${prod.id}/180/120" class="product-img">
                <div class="product-name">${prod.name}</div>
                <div class="product-price">${this.formatCurrency(prod.value)}</div>
                <div class="product-stock">Est: ${prod.stock}</div>
            `;
            el.onclick = () => this.openProductModal(prod.id);
            listOfProducts.appendChild(el);
        });
}

async function openProductModal(id = null) {
    console.log("Entrou modal");
    const modal = document.getElementById('modal-product');
    const form = document.getElementById('form-product');
    const deleteBtn = document.getElementById('btn-delete-prod');
    
    if (id) {
        const prod = await getApi("/product/"+id);
        document.getElementById('modal-product-title').textContent = "Editar Produto";
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-price').value = prod.value;
        document.getElementById('prod-stock').value = prod.stock;
        document.getElementById('prod-category').value = prod.category;
        document.getElementById('prod-barcode').value = prod.barcode || '';
        deleteBtn.style.display = 'block';
    } else {
        document.getElementById('modal-product-title').textContent = "Novo Produto";
        form.reset();
        document.getElementById('prod-id').value = '';
        deleteBtn.style.display = 'none';
    }
    
    modal.classList.add('active');
}

async function initHomeScream() {
    
    const responseAmountToday = await getApi("/order/amount-today");
    const responseCountSales = await getApi("/order/sales-today");
    const responseCountOpenOrder = await getApi("/order/all-open/quantity");
    const responseOpenOrders = await getApi("/order/all-open");
    const responseActiveProduct = await getApi("/product/all-active");
    buildListProduct(responseActiveProduct);
    buildCarouselOrder(responseOpenOrders);
    dashTotalSales.textContent = formatCurrency(responseAmountToday.amount);
    dashCounSales.textContent = responseCountSales.salesToday;
    dashCountOpenOrder.textContent = responseCountOpenOrder.quantityOpenOrders;
}


async function getApi(endpoint){  
    console.log("URL --> "+API_URL+endpoint)  
    const response = await fetch((API_URL+endpoint), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    return await response.json();
}

async function deleteApi(endpoint) {    
  const response = await fetch(API_URL + endpoint, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  return await response.json();
}

async function putApi(endpoint, data) {
    const response = await fetch((API_URL + endpoint), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        // O segredo está aqui: transformamos o objeto JS em texto JSON
        body: JSON.stringify(data) 
    });

    return await response.json();
}

async function postApi(endpoint, data) {
    const response = await fetch((API_URL + endpoint), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        // O segredo está aqui: transformamos o objeto JS em texto JSON
        body: JSON.stringify(data) 
    });

    return await response.json();
}

function formatCurrency(amount){
    const formatador = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

    return formatador.format(amount);
}

async function renderStock(){
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const view = document.getElementById('view-stock');
    if (view) {
        view.classList.add('active');
    }
    await renderStock2();
}

document.addEventListener('DOMContentLoaded', initHomeScream);



// const app = {
//     data: {
//         products: [],
//         orders: [],
//         currentOrder: null,
//         categories: ['Bebidas', 'Alimentos', 'Limpeza', 'Outros']
//     },

//     init() {
//         this.loadData();
//         this.renderDashboard();
//         this.renderStock();
//         this.renderOrderHistory();
        
//         // Configurar datas de filtro padrão (hoje)
//         const today = new Date().toISOString().split('T')[0];
//         const dateStart = document.getElementById('filter-date-start');
//         const dateEnd = document.getElementById('filter-date-end');
        
//         if(dateStart) dateStart.value = today;
//         if(dateEnd) dateEnd.value = today;
//     },

//     // --- Navegação ---
//     navigate(viewId) {
//         // Esconder todas as views
//         document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
//         document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

//         // Se for 'new-sale', abre a view específica que contém o overlay
//         if (viewId === 'new-sale') {
//             document.getElementById('view-new-sale').classList.add('active');
//             setTimeout(() => document.getElementById('new-order-number').focus(), 100);
//         } else if (viewId === 'pos') {
//             document.getElementById('view-pos').classList.add('active');
//         } else {
//             document.getElementById(`view-${viewId}`).classList.add('active');
//         }

//         // Atualizar sidebar
//         const btnMap = { 'home': 0, 'new-sale': 1, 'stock': 2, 'orders': 3 };
//         if (btnMap[viewId] !== undefined) {
//             document.querySelectorAll('.nav-btn')[btnMap[viewId]].classList.add('active');
//         }

//         // Renderizar específicos ao entrar
//         if (viewId === 'home') this.renderDashboard();
//         if (viewId === 'stock') this.renderStock();
//         if (viewId === 'orders') this.renderOrderHistory();
//     },

//     // --- Persistência ---
//     loadData() {
//         const storedProd = localStorage.getItem('pdv_products');
//         const storedOrders = localStorage.getItem('pdv_orders');

//         if (storedProd) {
//             this.data.products = JSON.parse(storedProd);
//         } else {
//             // Seed inicial (Dados falsos)
//             this.data.products = [
//                 { id: 1, name: 'Coca-Cola 350ml', price: 5.00, category: 'Bebidas', stock: 50, barcode: '789' },
//                 { id: 2, name: 'X-Burger Artesanal', price: 15.00, category: 'Alimentos', stock: 20, barcode: '123' },
//                 { id: 3, name: 'Detergente Líquido', price: 2.50, category: 'Limpeza', stock: 100, barcode: '456' },
//                 { id: 4, name: 'Água Mineral 500ml', price: 3.00, category: 'Bebidas', stock: 40, barcode: '788' },
//                 { id: 5, name: 'Batata Frita Crocante', price: 12.00, category: 'Alimentos', stock: 15, barcode: '124' },
//                 { id: 6, name: 'Suco de Laranja', price: 8.50, category: 'Bebidas', stock: 30, barcode: '111' }
//             ];
//             this.saveData();
//         }

//         if (storedOrders) {
//             this.data.orders = JSON.parse(storedOrders);
//         }
//     },

//     saveData() {
//         localStorage.setItem('pdv_products', JSON.stringify(this.data.products));
//         localStorage.setItem('pdv_orders', JSON.stringify(this.data.orders));
//     },

//     showToast(msg) {
//         const toast = document.getElementById('toast');
//         document.getElementById('toast-msg').textContent = msg;
//         toast.classList.add('show');
//         setTimeout(() => toast.classList.remove('show'), 3000);
//     },

//     formatCurrency(val) {
//         return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
//     },

//     // --- Lógica de Nova Venda e Carregamento ---
//     createNewOrder(e) {
//         e.preventDefault();
//         const number = document.getElementById('new-order-number').value;
//         const customerName = document.getElementById('new-order-number').value;
        
//         const newOrder = {
//             customer: customerName,
//             ticket: number
//         };

//         createNewOrderGlobal(newOrder);
//     },

//     loadOrderToPos(orderId) {
//         const order = orderId
//         if (!order) return;

//         this.data.currentOrder = order;
//         document.getElementById('pos-order-title').textContent = `Pedido #${order.ticket} ${order.status === 'closed' ? '(Finalizado)' : ''}`;
//         this.renderPosGrid(orderId); // Resetar grid
//         this.renderCart();
//         this.navigate('pos');

//         // Controle de botões baseado no status
//         const payBtn = document.querySelector('.cart-actions .btn-success');
//         const saveBtn = document.querySelector('.pos-header .btn-outline');
        
//         if (order.status === 'closed') {
//             payBtn.disabled = true;
//             payBtn.style.opacity = 0.5;
//             payBtn.innerHTML = '<i class="ph ph-lock"></i> Venda Finalizada';
//             saveBtn.style.display = 'none';
//         } else {
//             payBtn.disabled = false;
//             payBtn.style.opacity = 1;
//             payBtn.innerHTML = '<i class="ph ph-check-circle"></i> Pagar e Finalizar';
//             saveBtn.style.display = 'inline-flex';
//         }
//     },

//     // --- TELA: PDV (POS) ---
//     renderPosGrid(orderId) {
//         const container = document.getElementById('pos-products-grid');
//         container.innerHTML = '';
//         const searchTerm = document.getElementById('pos-search').value.toLowerCase();
        
//         orderId.products.forEach(prod => {
//             // Filtro simples
//             if (prod.name.toLowerCase().includes(searchTerm) || (prod.barcode && prod.barcode.includes(searchTerm))) {
//                 const el = document.createElement('div');
//                 el.className = 'product-item';
//                 el.innerHTML = `
//                     <img src="https://picsum.photos/seed/${prod.id}/180/120" class="product-img">
//                     <div class="product-name">${prod.name}</div>
//                     <div class="product-price">${this.formatCurrency(prod.price)}</div>
//                 `;
//                 el.onclick = () => this.addToCart(prod);
//                 container.appendChild(el);
//             }
//         });
//     },

//     filterPosProducts(val) {
//         this.renderPosGrid();
//     },

//     filterCategory(cat, el) {
//         document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
//         el.classList.add('active');
        
//         const container = document.getElementById('pos-products-grid');
//         const productsToRender = cat === 'all' 
//             ? this.data.products 
//             : this.data.products.filter(p => p.category === cat);
        
//         container.innerHTML = '';
//         productsToRender.forEach(prod => {
//             const item = document.createElement('div');
//             item.className = 'product-item';
//             item.innerHTML = `
//                 <img src="https://picsum.photos/seed/${prod.id}/180/120" class="product-img">
//                 <div class="product-name">${prod.name}</div>
//                 <div class="product-price">${this.formatCurrency(prod.price)}</div>
//             `;
//             item.onclick = () => this.addToCart(prod);
//             container.appendChild(item);
//         });
//     },

//     addToCart(prod) {
//         if (this.data.currentOrder.status === 'closed') return;
        
//         // Verificar se já existe
//         const existingItem = this.data.currentOrder.items.find(i => i.id === prod.id);
        
//         if (existingItem) {
//             existingItem.qty++;
//         } else {
//             this.data.currentOrder.items.push({
//                 id: prod.id,
//                 name: prod.name,
//                 price: prod.price,
//                 qty: 1
//             });
//         }
//         this.updateOrderTotal();
//         this.renderCart();
//     },

//     removeFromCart(prodId) {
//         if (this.data.currentOrder.status === 'closed') return;
        
//         const index = this.data.currentOrder.items.findIndex(i => i.id === prodId);
//         if (index > -1) {
//             this.data.currentOrder.items.splice(index, 1);
//         }
//         this.updateOrderTotal();
//         this.renderCart();
//     },

//     changeItemQty(prodId, delta) {
//         if (this.data.currentOrder.status === 'closed') return;

//         const item = this.data.currentOrder.items.find(i => i.id === prodId);
//         if (item) {
//             item.qty += delta;
//             if (item.qty <= 0) this.removeFromCart(prodId);
//             else {
//                 this.updateOrderTotal();
//                 this.renderCart();
//             }
//         }
//     },

//     updateOrderTotal() {
//         const total = this.data.currentOrder.items.reduce((acc, item) => acc + (item.price * item.qty), 0);
//         this.data.currentOrder.total = total;
//     },

//     renderCart() {
//         const list = document.getElementById('pos-cart-list');
//         list.innerHTML = '';
        
//         if(this.data.currentOrder.items.length === 0) {
//              list.innerHTML = `
//                 <div style="text-align: center; color: var(--text-muted); margin-top: 50px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
//                     <i class="ph ph-shopping-cart" style="font-size: 40px; opacity: 0.3;"></i>
//                     Carrinho vazio
//                 </div>`;
//             return;
//         }

//         this.data.currentOrder.items.forEach(item => {
//             const el = document.createElement('div');
//             el.className = 'cart-item';
//             el.innerHTML = `
//                 <div class="cart-item-info">
//                     <div class="cart-item-title">${item.name}</div>
//                     <div class="cart-item-price">${this.formatCurrency(item.price)} un</div>
//                 </div>
//                 <div class="cart-item-qty">
//                     <button class="qty-btn" onclick="app.changeItemQty(${item.id}, -1)">-</button>
//                     <span style="font-weight: 600;">${item.qty}</span>
//                     <button class="qty-btn" onclick="app.changeItemQty(${item.id}, 1)">+</button>
//                 </div>
//                 <div style="font-weight:700; margin-left: 15px; color: var(--primary);">${this.formatCurrency(item.price * item.qty)}</div>
//             `;
//             list.appendChild(el);
//         });

//         document.getElementById('pos-cart-total').textContent = this.formatCurrency(this.data.currentOrder.total);
        
//         // Salvar estado atual no array principal
//         const orderIdx = this.data.orders.findIndex(o => o.id === this.data.currentOrder.id);
//         if (orderIdx > -1) {
//             this.data.orders[orderIdx] = this.data.currentOrder;
//             this.saveData(); 
//         }
//     },

//     saveAndExitPos() {
//         if (this.data.currentOrder.items.length === 0) {
//             this.showToast("Venda vazia! Adicione itens ou cancele.");
//             return;
//         }
//         this.showToast("Venda salva com sucesso!");
//         this.navigate('home');
//     },

//     payAndClose() {
//         if (this.data.currentOrder.items.length === 0) {
//             this.showToast("Carrinho vazio!");
//             return;
//         }
//         // Atualizar status
//         const orderIdx = this.data.orders.findIndex(o => o.id === this.data.currentOrder.id);
//         this.data.orders[orderIdx].status = 'closed';
//         this.data.orders[orderIdx].date = new Date().toISOString(); // Atualiza data de fechamento
//         this.saveData();
        
//         // Dar baixa no estoque
//         this.data.currentOrder.items.forEach(item => {
//             const prod = this.data.products.find(p => p.id === item.id);
//             if(prod) prod.stock -= item.qty;
//         });
//         this.saveData();

//         this.showToast("Venda finalizada com sucesso!");
//         this.navigate('home');
//     },

//     // --- TELA: ESTOQUE ---
//     renderStock() {
//         const tbody = document.querySelector('#stock-table tbody');
//         if(!tbody) return;
//         tbody.innerHTML = '';
//         this.data.products.forEach(prod => {
//             const tr = document.createElement('tr');
//             tr.innerHTML = `
//                 <td><img src="https://picsum.photos/seed/${prod.id}/40/40" style="border-radius:8px; object-fit:cover;"></td>
//                 <td style="font-weight: 500;">${prod.name}</td>
//                 <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${prod.category}</span></td>
//                 <td>${this.formatCurrency(prod.price)}</td>
//                 <td style="${prod.stock < 10 ? 'color:var(--danger); font-weight:bold;' : 'font-weight:500;'}">${prod.stock}</td>
//                 <td>
//                     <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="app.openProductModal(${prod.id})">Editar</button>
//                 </td>
//             `;
//             tbody.appendChild(tr);
//         });
//     },

//     openProductModal(id = null) {
//         const modal = document.getElementById('modal-product');
//         const form = document.getElementById('form-product');
//         const deleteBtn = document.getElementById('btn-delete-prod');
        
//         if (id) {
//             const prod = this.data.products.find(p => p.id === id);
//             document.getElementById('modal-product-title').textContent = "Editar Produto";
//             document.getElementById('prod-id').value = prod.id;
//             document.getElementById('prod-name').value = prod.name;
//             document.getElementById('prod-price').value = prod.price;
//             document.getElementById('prod-stock').value = prod.stock;
//             document.getElementById('prod-category').value = prod.category;
//             document.getElementById('prod-barcode').value = prod.barcode || '';
//             deleteBtn.style.display = 'block';
//         } else {
//             document.getElementById('modal-product-title').textContent = "Novo Produto";
//             form.reset();
//             document.getElementById('prod-id').value = '';
//             deleteBtn.style.display = 'none';
//         }
        
//         modal.classList.add('active');
//     },

//     saveProduct(e) {
//         e.preventDefault();
//         const id = document.getElementById('prod-id').value;
//         const name = document.getElementById('prod-name').value;
//         const price = parseFloat(document.getElementById('prod-price').value);
//         const stock = parseInt(document.getElementById('prod-stock').value);
//         const category = document.getElementById('prod-category').value;
//         const barcode = document.getElementById('prod-barcode').value;

//         if (id) {
//             // Editar
//             const idx = this.data.products.findIndex(p => p.id == id);
//             this.data.products[idx] = { ...this.data.products[idx], name, price, stock, category, barcode };
//             this.showToast("Produto atualizado!");
//         } else {
//             // Novo
//             const newId = Date.now();
//             this.data.products.push({ id: newId, name, price, stock, category, barcode });
//             this.showToast("Produto criado!");
//         }

//         this.saveData();
//         document.getElementById('modal-product').classList.remove('active');
//         this.renderStock();
//         if(document.getElementById('view-home').classList.contains('active')) this.renderDashboard();
//     },

//     deleteProduct() {
//         const id = document.getElementById('prod-id').value;
//         if (confirm('Tem certeza que deseja excluir este produto?')) {
//             this.data.products = this.data.products.filter(p => p.id != id);
//             this.saveData();
//             document.getElementById('modal-product').classList.remove('active');
//             this.renderStock();
//             this.showToast("Produto excluído.");
//         }
//     },

//     // --- TELA: VENDAS (Histórico) ---
//     renderOrderHistory() {
//         const start = document.getElementById('filter-date-start').value;
//         const end = document.getElementById('filter-date-end').value;
//         const tbody = document.querySelector('#orders-table tbody');
//         if(!tbody) return;
        
//         tbody.innerHTML = '';

//         let filtered = this.data.orders;

//         if (start && end) {
//             filtered = filtered.filter(o => {
//                 const date = o.date.split('T')[0];
//                 return date >= start && date <= end;
//             });
//         }

//         // Ordenar por data decrescente
//         filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

//         filtered.forEach(order => {
//             const dateFmt = new Date(order.date).toLocaleString('pt-BR');
//             const statusClass = order.status === 'open' ? 'status-open' : 'status-closed';
//             const statusLabel = order.status === 'open' ? 'Aberta' : 'Finalizada';

//             const tr = document.createElement('tr');
//             tr.innerHTML = `
//                 <td style="font-weight: 600;">#${order.number}</td>
//                 <td>${dateFmt}</td>
//                 <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
//                 <td style="font-weight: 600;">${this.formatCurrency(order.total)}</td>
//                 <td>
//                     <button class="btn btn-outline" style="padding: 6px 12px; font-size: 0.8rem;" onclick="app.loadOrderToPos(${order.id})">Abrir</button>
//                 </td>
//             `;
//             tbody.appendChild(tr);
//         });
//     },

//     clearOrderFilters() {
//         document.getElementById('filter-date-start').value = '';
//         document.getElementById('filter-date-end').value = '';
//         this.renderOrderHistory();
//     }
// };

// // Inicializar app quando DOM estiver pronto
// document.addEventListener('DOMContentLoaded', () => {
//     app.init();
// });