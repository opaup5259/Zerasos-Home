import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || '150.158.32.155',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'zerasos',
      password: process.env.MYSQL_PASSWORD || 'Zeras0s_User_2026',
      database: process.env.MYSQL_DATABASE || 'zerasos_home',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    });
  }
  return pool;
}

export async function query(sql: string, params?: any[]): Promise<any[]> {
  const p = getPool();
  const [rows] = await p.execute(sql, params || []);
  return rows as any[];
}

export async function queryOne(sql: string, params?: any[]): Promise<any | null> {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<{ affectedRows: number; insertId?: number }> {
  const p = getPool();
  const [result] = await p.execute(sql, params || []);
  return result as any;
}
