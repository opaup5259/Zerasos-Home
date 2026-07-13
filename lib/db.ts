let pool: any = null;
let _mysqlAvailable: boolean | null = null;

async function getPool() {
  if (_mysqlAvailable === false) return null;
  if (pool) return pool;

  const host = process.env.MYSQL_HOST || '';
  if (!host) {
    _mysqlAvailable = false;
    return null;
  }

  try {
    const mysql = await import('mysql2/promise');
    pool = mysql.default.createPool({
      host,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'zerasos',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'zerasos_home',
      waitForConnections: true,
      connectionLimit: 3,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 5000,
    });
    _mysqlAvailable = true;
    return pool;
  } catch (e) {
    _mysqlAvailable = false;
    return null;
  }
}

export async function query(sql: string, params?: any[]): Promise<any[]> {
  const p = await getPool();
  if (!p) return [];
  try {
    const [rows] = await p.execute(sql, params || []);
    return rows;
  } catch (e) {
    _mysqlAvailable = false;
    return [];
  }
}

export async function queryOne(sql: string, params?: any[]): Promise<any | null> {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }> {
  const p = await getPool();
  if (!p) return { affectedRows: 0 };
  try {
    const [result] = await p.execute(sql, params || []);
    return result;
  } catch (e) {
    _mysqlAvailable = false;
    return { affectedRows: 0 };
  }
}
