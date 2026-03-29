import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:3000/graphql',
  credentials: 'include',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors }) => {
  if (!graphQLErrors) return;

  for (const err of graphQLErrors) {
    if (err.message.includes('액세스 토큰')) {
      localStorage.removeItem('accessToken');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }
});

export const client = new ApolloClient({
  link: from([
    errorLink,   // 👈 추가
    authLink,
    httpLink,
  ]),
  cache: new InMemoryCache(),
});