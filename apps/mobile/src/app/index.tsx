import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href={{ pathname: '/c/[id]', params: { id: 'new' } }} />;
}
