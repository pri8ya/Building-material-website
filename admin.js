document.addEventListener("DOMContentLoaded", () => {
    fetchOrders(); // Load orders when the page is ready

    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('authToken'); // Clear auth token
        alert("Logged out successfully!");
        window.location.href = 'adminlog.html'; // Redirect to login page
    });
});

// Function to fetch and display orders
async function fetchOrders() {
    try {
        const response = await fetch('http://localhost:3000/api/orders'); // Fetch orders from backend
        const orders = await response.json(); // Convert response to JSON
        const tableBody = document.getElementById('orderTable'); // Get the table body element

        tableBody.innerHTML = ''; // Clear existing rows

        // Counters for dashboard stats
        let totalOrders = 0, approvedOrders = 0, deliveredThisMonth = 0;

        // Get the current month and year
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        orders.forEach(order => {
            totalOrders++;

            if (order.status === "Approved") approvedOrders++;

            // Check if order was delivered in the current month
            const orderDate = new Date(order.created_at);
            if (order.status === "Delivered" && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                deliveredThisMonth++;
            }

            // Create table row for each order
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id}</td>
                <td>${order.full_name}</td>
                <td>${order.phone_number}</td>
                <td>${order.delivery_address}</td>
                <td>${order.materials}</td>
                <td>${order.transport_option}</td>
                <td>
                    ${order.status}
                    ${order.status !== "Approved" ? `<button class="btn btn-success approve-btn mt-2" data-order-id="${order.id}">Approve</button>` : ''}
                </td>
                <td>${new Date(order.created_at).toLocaleString()}</td>
            `;

            tableBody.appendChild(row);
        });

        // Update dashboard cards
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('approvedOrders').textContent = approvedOrders;
        document.getElementById('deliveredThisMonth').textContent = deliveredThisMonth;

        // Attach event listeners to approval buttons
        document.querySelectorAll('.approve-btn').forEach(button => {
            button.addEventListener('click', approveOrder);
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        alert("Failed to load orders. Please check your connection.");
    }
}

// Function to approve an order
async function approveOrder(event) {
    const orderId = event.target.dataset.orderId;
    console.log("Approving Order ID:", orderId);

    if (!orderId) {
        alert("Invalid order ID!");
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Approved' })
        });

        console.log("Response Status:", response.status);
        const text = await response.text();
        console.log("Response Text:", text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            console.error("Invalid JSON Response:", text);
            alert("Error: Server returned an invalid response.");
            return;
        }

        if (response.ok) {
            alert("Order approved successfully!");
            fetchOrders();
        } else {
            alert("Failed to update order status: " + data.message);
        }
    } catch (error) {
        console.error("Error approving order:", error);
        alert("Error approving order.");
    }
}

