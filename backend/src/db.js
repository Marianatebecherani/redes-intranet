import mysql from 'mysql2/promise';

export function criarPool(configDb) {
  return mysql.createPool({
    ...configDb,
    charset: 'utf8mb4',
    connectionLimit: 10,
    waitForConnections: true,
    timezone: 'Z',
    dateStrings: false,
  });
}
