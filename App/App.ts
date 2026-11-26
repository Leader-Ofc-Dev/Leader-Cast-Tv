import { supabase } from './database';

async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error('Database Error:', error.message);
    return;
  }

  console.log(data);
}

getUsers();
