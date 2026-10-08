function calculateDiscount(price, customerType) {

  if (price <= 0) {
    throw new Error("Price must be greater than zero");
  }

  if (customerType === "premium") {
    return price * 0.9;
  }

  if (customerType === "vip") {
    return price * 0.7;
  }

  if (customerType === "regular") {
    return price * 0.95;
  }

  return price;
}

module.exports = {
  calculateDiscount
};