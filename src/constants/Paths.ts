
export default {
  Base: '/api/v1',
  List: {
    Base: '/list',
    Id: '/:listId',
    Create: '/create',
  },
  Items: {
    Base: '/items',
    Create: '/create',
    Id: '/:itemId',
  },
  Users: {
    Base: '/users',
    Get: '/me',
    Update: '/update',
    Delete: '/delete',
  },
  Auth: {
    Base: '/auth',
    Login: '/login',
    Register: '/register',
  },
} as const;
