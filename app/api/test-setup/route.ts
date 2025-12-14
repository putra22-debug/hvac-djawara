import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Test endpoint to verify database setup
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: [],
    };

    // Check 1: Can we connect to Supabase?
    results.checks.push({ name: 'Supabase Connection', status: 'OK' });

    // Check 2: Can we fetch tenant hvac-djawara?
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, slug, name')
      .eq('slug', 'hvac-djawara')
      .single();

    if (tenantError) {
      results.checks.push({
        name: 'Fetch Tenant',
        status: 'FAIL',
        error: tenantError.message,
        code: tenantError.code,
      });
    } else if (tenant) {
      results.checks.push({
        name: 'Fetch Tenant',
        status: 'OK',
        data: tenant,
      });
    } else {
      results.checks.push({
        name: 'Fetch Tenant',
        status: 'FAIL',
        error: 'Tenant not found',
      });
    }

    // Check 3: Can we insert a test client? (anonymous)
    if (tenant) {
      const testPhone = `TEST-${Date.now()}`;
      const { data: testClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenant.id,
          name: 'Test Client',
          phone: testPhone,
        })
        .select('id')
        .single();

      if (clientError) {
        results.checks.push({
          name: 'Insert Test Client (Anonymous)',
          status: 'FAIL',
          error: clientError.message,
          code: clientError.code,
          hint: clientError.hint,
        });
      } else {
        results.checks.push({
          name: 'Insert Test Client (Anonymous)',
          status: 'OK',
          data: { id: testClient?.id },
        });

        // Clean up test client
        if (testClient?.id) {
          await supabase.from('clients').delete().eq('id', testClient.id);
        }
      }

      // Check 4: Can we insert a test order?
      if (testClient?.id) {
        const { data: testOrder, error: orderError } = await supabase
          .from('service_orders')
          .insert({
            tenant_id: tenant.id,
            client_id: testClient.id,
            order_type: 'maintenance',
            status: 'pending',
            priority: 'medium',
            service_title: 'Test Order',
            location_address: 'Test Address',
          })
          .select('id')
          .single();

        if (orderError) {
          results.checks.push({
            name: 'Insert Test Order (Anonymous)',
            status: 'FAIL',
            error: orderError.message,
            code: orderError.code,
            hint: orderError.hint,
          });
        } else {
          results.checks.push({
            name: 'Insert Test Order (Anonymous)',
            status: 'OK',
            data: { id: testOrder?.id },
          });

          // Clean up test order
          if (testOrder?.id) {
            await supabase.from('service_orders').delete().eq('id', testOrder.id);
          }
        }
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Test failed',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
