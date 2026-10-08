✦ Here is a production-ready, secure integration plan to add a payment gateway (using Stripe as the industry standard) to
  this discount-calculation application.

  ---

  1. Architectural Overview
  We will decouple the billing logic into a separate Payment Service and establish a secure, 3-way handshake between the
  Frontend, our Backend, and Stripe.

    1 ┌───────────┐             ┌────────────┐             ┌──────────┐
    2 │  Client   │             │ My Backend │             │  Stripe  │
    3 └─────┬─────┘             └─────┬──────┘             └────┬─────┘
    4       │  1. Initiate Cart       │                         │
    5       ├────────────────────────>│                         │
    6       │                         │ 2. Apply Discounts      │
    7       │                         │    (calculateDiscount)  │
    8       │                         │                         │
    9       │                         │ 3. Create PaymentIntent │
   10       │                         ├────────────────────────>│
   11       │                         │                         │
   12       │                         │ 4. Client Secret        │
   13       │                         │<────────────────────────┤
   14       │  5. Client Secret       │                         │
   15       │<────────────────────────┤                         │
   16       │                         │                         │
   17       │  6. Secure Card input & payment submit            │
   18       ├──────────────────────────────────────────────────>│
   19       │                         │                         │
   20       │  7. Success / Failure   │                         │
   21       │<──────────────────────────────────────────────────┤
   22       │                         │                         │
   23       │                         │ 8. Secure Webhook       │
   24       │                         │    (Payment Success)    │
   25       │                         │<────────────────────────┤

  ---

  2. High-Level Integration Steps

  Phase 1: Environment & Dependency Setup
   * Secure Configurations: Add .env support (via dotenv) to manage sensitive API keys (STRIPE_SECRET_KEY,
     STRIPE_WEBHOOK_SECRET) locally without committing them to source control.
   * Dependencies: Add the official stripe Node.js library (npm install stripe).

  Phase 2: Checkout Backend API (POST /api/checkout)
  The frontend sends the order details (e.g., items, customer type).
   1. Validation: Check that items exist and have valid prices.
   2. Discount Application: Import and use our calculateDiscount function on the server side to determine the final,
      discounted total (never trust the client to send the price).
   3. Currency Conversion: Convert the final amount to the smallest currency unit (e.g., cents for USD/CAD, so $70.00
      becomes 7000) to avoid floating-point inaccuracies.
   4. Stripe PaymentIntent: Call stripe.paymentIntents.create({ amount, currency, metadata: { customerType, orderId } }).
   5. Session State: Store the order in a local database as pending.
   6. Response: Return the client_secret to the frontend.

  Phase 3: Client-Side Integration (Stripe Elements)
   * Use Stripe Elements to render secure, PCI-compliant card inputs on the frontend.
   * Confirm the payment using stripe.confirmCardPayment(clientSecret, { payment_method: ... }). This directly sends card
     details from the client browser to Stripe, keeping your backend out of PCI compliance scope.

  Phase 4: Webhook Event Handler (POST /api/webhooks)
  Payments can succeed or fail asynchronously (e.g., 3D Secure verification, bank transfers). We must implement a webhook
  endpoint.
   1. Raw Body Parser: Configure Express/Node to receive the webhook body as raw bytes.
   2. Signature Verification: Use stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) to guarantee the request
      authentically originated from Stripe.
   3. State Transition:
      * On payment_intent.succeeded: Mark the order state as paid and trigger fulfillment (e.g., send invoice, provision
        access).
      * On payment_intent.payment_failed: Mark order as failed and alert the user.

  ---

  3. Key QA, Security, and Edge-Case Considerations

  ┌───────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Area          │ Security / Reliability Strategy                                                                    │
  ├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Price         │ Never trust prices sent from the client. Always fetch product unit prices from your database and   │
  │ Tampering     │ calculate the discount on your backend server.                                                     │
  │ Idempotency   │ Pass an idempotency_key (typically the Order ID) to stripe.paymentIntents.create() to prevent      │
  │               │ double-charging the customer in case of network retries.                                           │
  │ Database Sync │ Never trigger order fulfillment in the direct checkout response. Network issues can disconnect the │
  │               │ client before they see success. Always rely on verified Stripe webhooks for shipping/fulfillment.  │
  │ Stripe        │ Stripe requires integer amounts. Ensure you handle round-off cases properly. (e.g., if a 30%       │
  │ Precision     │ discount results in $70.003, round it to $70.00 / 7000 cents).                                     │
  └───────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────┘
