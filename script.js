document.getElementById("submitOrder").addEventListener("click", async (event) => {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value;
  const phoneNumber = document.getElementById("phoneNumber").value;
  const deliveryAddress = document.getElementById("deliveryAddress").value;
  const materials = Array.from(
    document.querySelectorAll('input[name="materials"]:checked')  // Corrected name here
  ).map((input) => input.value);
  const transport = document.getElementById("transport").value;

  // Full Name validation - must be alphabetic
  const nameRegex = /^[A-Za-z\s]+$/;
  if (!nameRegex.test(fullName)) {
    alert("Please enter a valid name (only letters and spaces allowed).");
    return;
  }

  // Phone Number validation - must be numeric and of reasonable length
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phoneNumber)) {
    alert("Please enter a valid 10-digit phone number.");
    return;
  }

  // Delivery Address validation - should not contain numbers
  const addressRegex = /^[A-Za-z\s,.-]+$/;
  if (!addressRegex.test(deliveryAddress)) {
    alert("Delivery address should not contain numbers.");
    return;
  }

  // Check if all fields are filled
  if (!fullName || !phoneNumber || !deliveryAddress || materials.length === 0 || !transport) {
    alert("Please fill out all fields before submitting the order.");
    return;
  }

  const orderData = {
    full_name: fullName,
    phone_number: phoneNumber,
    delivery_address: deliveryAddress,
    materials,
    transport_option: transport,
  };

  try {
    const response = await fetch("/submitOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      document.getElementById("orderForm").reset();
    } else {
      alert("Failed to submit the order.");
    }
  } catch (error) {
    console.error("Error submitting order:", error);
  }
});
