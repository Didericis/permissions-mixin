# didericis:permissions-mixin

A permissions mixin for the [mdg:validated-method](https://github.com/meteor/validated-method) that uses the [alanning:roles](https://github.com/alanning/meteor-roles) package.

## Install

```sh
$ meteor add didericis:permissions-mixin
```

## Define

```js
const method = new ValidatedMethod({
  mixins: [PermissionsMixin],
  name,
  allow,            //optional array of permissions
  deny,             //optional array of permissions
  permissionsError, //optional custom error message
  validate,
  run
});
```

## Examples

#### Allow

```js
// Method definition
const allowAdminMethod = new ValidatedMethod({
    name: 'AdminMethod',
    mixins: [PermissionsMixin],
    allow: [{
        roles: ['admin'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});
```

#### Deny

```js
// Method definition
const denyBasicMethod = new ValidatedMethod({
    name: 'DenyBasicMethod',
    mixins: [PermissionsMixin],
    deny: [{
        roles: ['basic'],
        group: Roles.GLOBAL_GROUP
    }],
    validate: new SimpleSchema({
        text: { type: String }
    }).validator(),
    run({text}) {
        return testCollection.insert({text: text});
    }
});
```


## method#run

This will run the permissions check. This run is what's used in `method.call`.

```js
method.run({
  message: 'hi'
});
```

## method#runTrusted

This will not run the permissions check. This run is not used in `method.call`

```js
method.runTrusted({
  message: 'hi'
});
```

## Run Tests

To run tests, make sure the mdg:validated-method package has been updated (`meteor update mdg:validated-method`) and then run:

`meteor test-packages --driver-package practicalmeteor:mocha ./`
