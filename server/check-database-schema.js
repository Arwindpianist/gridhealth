const { createClient } = require('@supabase/supabase-js');

// Load environment variables (you'll need to set these)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fzlosmvtbtyhimdiynwg.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

if (!supabaseKey || supabaseKey === 'your-service-role-key') {
  console.log('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('   export SUPABASE_SERVICE_ROLE_KEY="your-actual-key"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema for health_metrics table...\n');

    // Check what columns currently exist
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'health_metrics')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error querying columns:', columnsError);
      return;
    }

    console.log('📊 Current table structure:');
    console.log('┌─────────────────────┬─────────────────┬──────────┬─────────────────┐');
    console.log('│ Column Name         │ Data Type       │ Nullable │ Default         │');
    console.log('├─────────────────────┼─────────────────┼──────────┼─────────────────┤');

    columns.forEach(col => {
      const name = (col.column_name || '').padEnd(19);
      const type = (col.data_type || '').padEnd(17);
      const nullable = (col.is_nullable || '').padEnd(10);
      const defaultVal = (col.column_default || 'NULL').padEnd(17);
      console.log(`│ ${name}│ ${type}│ ${nullable}│ ${defaultVal}│`);
    });

    console.log('└─────────────────────┴─────────────────┴──────────┴─────────────────┘\n');

    // Check for required columns that might be missing
    const requiredColumns = [
      'metric_type',
      'value',
      'license_key',
      'system_info',
      'performance_metrics',
      'disk_health',
      'memory_health',
      'network_health',
      'service_health',
      'security_health',
      'agent_info',
      'raw_data',
      'created_at',
      'updated_at'
    ];

    const existingColumnNames = columns.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumnNames.includes(col));

    if (missingColumns.length > 0) {
      console.log('⚠️  Missing columns that need to be added:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\n💡 Run the migration script to add these columns.');
    } else {
      console.log('✅ All required columns are present!');
    }

    // Check for NOT NULL constraints that might cause issues
    const notNullColumns = columns.filter(col => col.is_nullable === 'NO');
    console.log('\n🔒 NOT NULL columns (must have values):');
    notNullColumns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check foreign key constraints
    console.log('\n🔗 Checking foreign key constraints...');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select(`
        constraint_name,
        constraint_type,
        table_name
      `)
      .eq('table_name', 'health_metrics');

    if (constraintsError) {
      console.error('❌ Error querying constraints:', constraintsError);
    } else {
      console.log('📋 Table constraints:');
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  }
}

// Run the check
checkDatabaseSchema(); 