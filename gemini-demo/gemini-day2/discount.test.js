const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDiscount } = require('./discount');

test('calculateDiscount - normal cases', async (t) => {
  await t.test('regular customer should get 5% discount', () => {
    assert.equal(calculateDiscount(100, 'regular'), 95);
  });

  await t.test('premium customer should get 10% discount', () => {
    assert.equal(calculateDiscount(100, 'premium'), 90);
  });

  await t.test('vip customer should get 30% discount', () => {
    assert.equal(calculateDiscount(100, 'vip'), 70);
  });

  await t.test('guest customer should get no discount', () => {
    assert.equal(calculateDiscount(100, 'guest'), 100);
  });
});

test('calculateDiscount - boundary cases', async (t) => {
  await t.test('minimum positive price precision check', () => {
    assert.equal(calculateDiscount(0.01, 'regular'), 0.0095);
  });

  await t.test('large price value for VIP customer', () => {
    assert.equal(calculateDiscount(1000000, 'vip'), 700000);
  });

  await t.test('price exactly zero should throw error', () => {
    assert.throws(() => {
      calculateDiscount(0, 'regular');
    }, {
      message: 'Price must be greater than zero'
    });
  });
});

test('calculateDiscount - invalid and edge cases', async (t) => {
  await t.test('negative price should throw error', () => {
    assert.throws(() => {
      calculateDiscount(-100, 'vip');
    }, {
      message: 'Price must be greater than zero'
    });
  });

  await t.test('non-numeric price NaN should return NaN', () => {
    assert.ok(Number.isNaN(calculateDiscount(NaN, 'vip')));
  });

  await t.test('missing price undefined should return NaN', () => {
    assert.ok(Number.isNaN(calculateDiscount(undefined, 'vip')));
  });

  await t.test('null price should throw error due to coercion to 0', () => {
    assert.throws(() => {
      calculateDiscount(null, 'vip');
    }, {
      message: 'Price must be greater than zero'
    });
  });

  await t.test('string numeric price should be coerced and return discounted number', () => {
    assert.equal(calculateDiscount('100', 'vip'), 70);
  });
});

test('calculateDiscount - customer type variations', async (t) => {
  await t.test('case-sensitive customerType "VIP" should get no discount', () => {
    assert.equal(calculateDiscount(100, 'VIP'), 100);
  });

  await t.test('case-sensitive customerType "Regular" should get no discount', () => {
    assert.equal(calculateDiscount(100, 'Regular'), 100);
  });

  await t.test('empty customerType should get no discount', () => {
    assert.equal(calculateDiscount(100, ''), 100);
  });

  await t.test('missing customerType should get no discount', () => {
    assert.equal(calculateDiscount(100), 100);
  });

  await t.test('null customerType should get no discount', () => {
    assert.equal(calculateDiscount(100, null), 100);
  });
});
