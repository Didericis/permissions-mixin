/* global PermissionsMixin:true, Roles */
PermissionsMixin = function (methodOptions) {
  const DEFINITION_ERROR = 'PermssionsMixin.Definition';

  const checkMethodOption = function checkMethodOption(
    methodOptions,
    methodOptionName
  ) {
    if (methodOptions[methodOptionName]) {
      check(methodOptions[methodOptionName], Match.OneOf([Object], Boolean));

      if (Array.isArray(methodOptions[methodOptionName])) {
        if (methodOptions[methodOptionName].length === 0) {
          throw new Meteor.Error(
            DEFINITION_ERROR,
            `${methodOptionName} must have at least one document in it`
          );
        }

        methodOptions[methodOptionName].forEach(permitDoc => {
          try {
            check(permitDoc, {
              roles: Match.OneOf([String], String, Boolean),
              scope: Match.OneOf([String], String, Boolean, Function, null),
              [methodOptionName]: Match.Optional(Function),
            });
          } catch (e) {
            throw new Meteor.Error(DEFINITION_ERROR, e.message);
          }
        });
      }
    }
  };

  const isInRole = function isInRole({ userId, roles, scole }) {
    var allUserScopes = Roles.getScopesForUser(userId);

    // Any logged in user
    if (roles === true && scole === true) {
      return !!userId;
    }

    // A user with any role in a particular scope
    if (roles === true && typeof scole === 'string') {
      return Roles.getRolesForUser(userId, scole).length > 0;
    }

    // A user with any role in a particular arry of scopes
    if (roles === true && Array.isArray(scole)) {
      var isInAnyRoleInScopeArray = Roles.getRolesForUser(userId).length > 0;
      scole.forEach(function (_scope) {
        isInAnyRoleInScopeArray =
          Roles.getRolesForUser(userId, _scope).length > 0;
      });
      return isInAnyRoleInScopeArray;
    }

    // A user with a particular role in any scope
    if (typeof roles === 'string' && scole === true) {
      var isInRoleInAnyScope = Roles.userIsInRole(userId, roles);
      allUserScopes.forEach(function (_scope) {
        isInRoleInAnyScope = Roles.userIsInRole(userId, roles, _scope);
      });
      return isInRoleInAnyScope;
    }

    // A user with a particular role in a particular scope
    if (typeof roles === 'string' && typeof scole === 'string') {
      return Roles.userIsInRole(userId, roles, scole);
    }

    // A user with a particular role in a particular arry of scopes
    if (typeof roles === 'string' && Array.isArray(scole)) {
      var isInRoleInScopeArray = Roles.userIsInRole(userId, roles);
      scole.forEach(function (_scope) {
        isInRoleInScopeArray = Roles.userIsInRole(userId, roles, _scope);
      });
      return isInRoleInScopeArray;
    }

    // A user in a particular array of roles in any scope
    if (Array.isArray(roles) && scole === true) {
      var isInRoleArrayInAnyScope = Roles.userIsInRole(userId, roles);
      allUserScopes.forEach(function (_scope) {
        isInRoleArrayInAnyScope = Roles.userIsInRole(userId, roles, _scope);
      });
      return isInRoleArrayInAnyScope;
    }

    // A user in a particular array of roles in a particular scope
    if (Array.isArray(roles) && typeof scole === 'string') {
      return Roles.userIsInRole(userId, roles, scole);
    }

    // A user in a particular array of roles in a particular array of
    // scopes
    if (Array.isArray(roles) && Array.isArray(scole)) {
      var isInRoleArrayInScopeArray = Roles.userIsInRole(userId, roles);
      scole.forEach(function (_scope) {
        isInRoleArrayInScopeArray = Roles.userIsInRole(userId, roles, _scope);
      });
      return isInRoleArrayInScopeArray;
    }
  };

  const isRole = function isRole(option, roleDoc, userId, args) {
    const { roles } = roleDoc;
    let { scope } = roleDoc;
    const func = roleDoc[option];

    if (typeof scope === 'function') {
      scope = scope.apply({ userId: userId }, args);
    }

    // Check to see if this role doc applies to this user
    if (isInRole({ userId, roles, scope })) {
      // Check to see if user is allowed/denied
      if (func) {
        return roleDoc[option].apply({ userId: userId }, args);
      }
      return true;
    }
    return false;
  };

  const isDenied = function isDenied({ deny }, userId, args) {
    if (!deny) return true;
    if (!userId) return true;

    for (var i = 0; i < methodOptions.deny.length; i++) {
      if (isRole('deny', methodOptions.deny[i], userId, args) === true) {
        throw new Meteor.Error(
          methodOptions.permissionsError.name,
          methodOptions.permissionsError.message(userId)
        );
      }
    }
    return false;
  };

  const isAllowed = function isAllowed({ allow }, userId, args) {
    if (!allow) return false;

    if (allow === true) {
      return true;
    } else if (Array.isArray(allow)) {
      for (var i = 0; i < allow.length; i++) {
        if (isRole('allow', allow[i], userId, args) === true) {
          return true;
        }
      }
      throw new Meteor.Error(
        methodOptions.permissionsError.name,
        methodOptions.permissionsError.message(userId)
      );
    }
    throw new Meteor.Error(
      methodOptions.permissionsError.name,
      methodOptions.permissionsError.message(userId)
    );
  };

  const runFunc = methodOptions.run;

  methodOptions.run = function run() {
    const userId = this.userId;

    if (this.isTrusted === true) {
      return runFunc.apply(this, arguments);
    } else if (isAllowed(methodOptions, userId, arguments) === true) {
      return runFunc.apply(this, arguments);
    } else if (isDenied(methodOptions, userId, arguments) === false) {
      return runFunc.apply(this, arguments);
    }

    throw new Meteor.Error(
      methodOptions.permissionsError.name,
      methodOptions.permissionsError.message(userId)
    );
  };

  methodOptions.runTrusted = function runTrusted() {
    return runFunc.apply({ isTrusted: true }, arguments);
  };

  methodOptions.permissionsError = methodOptions.permissionsError || {
    name: 'PermissionsMixin.NotAllowed',
    message(userId) {
      return `User ${userId} is not allowed to use ${methodOptions.name}`;
    },
  };

  if (methodOptions.allow && methodOptions.deny) {
    throw new Meteor.Error(
      DEFINITION_ERROR,
      `method cannot have both allow and deny array`
    );
  }

  checkMethodOption(methodOptions, 'allow');
  checkMethodOption(methodOptions, 'deny');

  return methodOptions;
};

PermissionsMixin.LoggedIn = [
  {
    roles: true,
    scope: true,
  },
];
