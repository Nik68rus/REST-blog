const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const authMidleware = require('../middleware/is-auth');

describe('Auth middleware', () => {
  it('should throw an error if no auth header is present', () => {
    const req = {
      get: () => null,
    };

    expect(authMidleware.bind(this, req, {}, () => {})).to.throw(
      'Not authenticated!'
    );
  });

  it('should throw an error if auth header is only one word', () => {
    const req = {
      get: () => 'qqq',
    };

    expect(authMidleware.bind(this, req, {}, () => {})).to.throw();
  });

  it('should yield a userId after decoding the token', () => {
    const req = {
      get: () => 'Bearer qqq',
    };

    sinon.stub(jwt, 'verify');

    jwt.verify.returns({ userId: 'aaa' });
    authMidleware(req, {}, () => {});
    expect(req).to.have.property('userId', 'aaa');
    expect(jwt.verify.called).to.be.true;
    jwt.verify.restore();
  });

  it('should throw a error if token incorrect', () => {
    const req = {
      get: () => 'Bearer qqq',
    };

    expect(authMidleware.bind(this, req, {}, () => {})).to.throw();
  });
});
