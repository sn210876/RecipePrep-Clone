import { supabase } from '../lib/supabase';

export interface CreateCheckoutSessionParams {
  amount: number;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

export const createCheckoutSession = async (
  params: CreateCheckoutSessionParams
): Promise<CreateCheckoutSessionResponse> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  return response.json();
};

export const createCustomerPortalSession = async (): Promise<CreatePortalSessionResponse> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer-portal`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create portal session');
  }

  return response.json();
};

export const getPaymentHistory = async () => {
  const { data, error } = await supabase
    .from('payment_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
