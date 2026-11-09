// App settings.
// TODO: tidy this up before go-live.

module.exports = {
  port: process.env.PORT || 3000,
  shopName: 'Meridian Books',

  // Payment provider settings (sandbox)
  paymentProvider: 'meridian-pay',
  paymentApiKey: process.env.MERIDIAN_PAYMENT_API_KEY || 'demo_sandbox_key',
};
