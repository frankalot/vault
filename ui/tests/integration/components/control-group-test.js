import { moduleForComponent, test } from 'ember-qunit';
import Ember from 'ember';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import { create } from 'ember-cli-page-object';
import controlGroup from '../../pages/components/control-group';

const component = create(controlGroup);

const controlGroupService = Ember.Service.extend({
  init() {
    this.set('wrapInfo', null);
  },
  wrapInfoForAccessor() {
    return this.get('wrapInfo');
  },
});

const authService = Ember.Service.extend();

moduleForComponent('control-group', 'Integration | Component | control group', {
  integration: true,
  beforeEach() {
    component.setContext(this);
    this.register('service:auth', authService);
    this.register('service:control-group', controlGroupService);
    this.inject.service('controlGroup');
    this.inject.service('auth');
  },

  afterEach() {
    component.removeContext();
  },
});

const setup = (modelData = {}, authData = {}) => {
  let modelDefaults = {
    approved: false,
    requestPath: 'foo/bar',
    id: 'accessor',
    requestEntity: { id: 'requestor', name: 'entity8509' },
    reload: sinon.stub(),
  };
  let authDataDefaults = { entity_id: 'requestor' };

  return {
    model: {
      ...modelDefaults,
      ...modelData,
    },
    authData: {
      ...authDataDefaults,
      ...authData,
    },
  };
};

test('requestor rendering', function(assert) {
  let { model, authData } = setup();
  this.set('model', model);
  this.set('auth.authData', authData);
  this.render(hbs`{{control-group model=model}}`);
  assert.ok(component.showsAccessorCallout, 'shows accessor callout');
  assert.equal(component.bannerPrefix, 'Locked');
  assert.equal(component.bannerText, 'The path you requested is locked by a control group');
  assert.equal(component.requestorText, `You are requesting access to ${model.requestPath}`);
  assert.equal(component.showsTokenText, false, 'does not show token message when there is no token');
  assert.ok(component.showsRefresh, 'shows refresh button');
  assert.ok(component.authorizationText, 'Awaiting authorization.');
});

test('requestor rendering: with token', function(assert) {
  let { model, authData } = setup();
  this.set('model', model);
  this.set('auth.authData', authData);
  this.set('controlGroup.wrapInfo', { token: 'token' });
  this.render(hbs`{{control-group model=model}}`);
  assert.equal(component.showsTokenText, true, 'shows token message');
  assert.equal(component.token, 'token', 'shows token value');
});

test('requestor rendering: some approvals', function(assert) {
  let { model, authData } = setup({ authorizations: [{ name: 'manager 1' }, { name: 'manager 2' }] });
  this.set('model', model);
  this.set('auth.authData', authData);
  this.render(hbs`{{control-group model=model}}`);
  assert.ok(component.authorizationText, 'Already approved by manager 1, manager 2');
});

test('requestor rendering: approved with no token', function(assert) {
  let { model, authData } = setup({ approved: true });
  this.set('model', model);
  this.set('auth.authData', authData);
  this.render(hbs`{{control-group model=model}}`);

  assert.equal(component.bannerPrefix, 'Success!');
  assert.equal(component.bannerText, 'You have been given authorization');
  assert.equal(component.showsTokenText, false, 'does not show token message when there is no token');
  assert.notOk(component.showsRefresh, 'does not shows refresh button');
  assert.ok(component.showsSuccessComponent, 'renders control group success');
});

test('requestor rendering: approved with token', function(assert) {
  let { model, authData } = setup({ approved: true });
  this.set('model', model);
  this.set('auth.authData', authData);
  this.set('controlGroup.wrapInfo', { token: 'token' });
  this.render(hbs`{{control-group model=model}}`);
  assert.equal(component.showsTokenText, true, 'shows token');
  assert.notOk(component.showsRefresh, 'does not shows refresh button');
  assert.ok(component.showsSuccessComponent, 'renders control group success');
});

test('authorizer rendering', function(assert) {
  let { model, authData } = setup({ canAuthorize: true }, { entity_id: 'manager' });

  this.set('model', model);
  this.set('auth.authData', authData);
  this.render(hbs`{{control-group model=model}}`);

  assert.equal(component.bannerPrefix, 'Locked');
  assert.equal(component.bannerText, 'Someone is requesting access to a path locked by a control group');
  assert.equal(
    component.requestorText,
    `${model.requestEntity.name} is requesting access to ${model.requestPath}`
  );
  assert.equal(component.showsTokenText, false, 'does not show token message when there is no token');

  assert.ok(component.showsAuthorize, 'shows authorize button');
});

test('authorizer rendering:authorized', function(assert) {
  let { model, authData } = setup(
    { canAuthorize: true, authorizations: [{ id: 'manager', name: 'manager' }] },
    { entity_id: 'manager' }
  );

  this.set('model', model);
  this.set('auth.authData', authData);
  this.render(hbs`{{control-group model=model}}`);

  assert.equal(component.bannerPrefix, 'Thanks!');
  assert.equal(component.bannerText, 'You have given authorization');
  assert.ok(component.showsBackLink, 'back link is visible');
});

test('authorizer rendering: authorized and success', function(assert) {
  let { model, authData } = setup(
    { approved: true, canAuthorize: true, authorizations: [{ id: 'manager', name: 'manager' }] },
    { entity_id: 'manager' }
  );

  this.set('model', model);
  this.set('auth.authData', authData);
  this.render(hbs`{{control-group model=model}}`);

  assert.equal(component.bannerPrefix, 'Thanks!');
  assert.equal(component.bannerText, 'You have given authorization');
  assert.ok(component.showsBackLink, 'back link is visible');
  assert.equal(
    component.requestorText,
    `${model.requestEntity.name} is authorized to access ${model.requestPath}`
  );
  assert.notOk(component.showsSuccessComponent, 'does not render control group success');
});

test('third-party: success', function(assert) {
  let { model, authData } = setup(
    { approved: true, canAuthorize: true, authorizations: [{ id: 'foo', name: 'foo' }] },
    { entity_id: 'manager' }
  );

  this.set('model', model);
  this.set('auth.authData', authData);
  this.render(hbs`{{control-group model=model}}`);
  assert.equal(component.bannerPrefix, 'Success!');
  assert.equal(component.bannerText, 'This control group has been authorized');
  assert.ok(component.showsBackLink, 'back link is visible');
  assert.notOk(component.showsSuccessComponent, 'does not render control group success');
});
