const Stripe = require('stripe');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
