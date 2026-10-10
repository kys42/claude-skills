import { Redirect } from 'expo-router';

/** Any unknown address (e.g. the web build served under a sub-path) walks back to the trail. */
export default function NotFound() {
  return <Redirect href="/" />;
}
