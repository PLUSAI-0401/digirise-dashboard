const Stripe = require('stripe');

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('WARNING: STRIPE_SECRET_KEY is not set. API calls will fail.');
}

const stripe = key ? Stripe(key) : null;

module.exports = stripe;
