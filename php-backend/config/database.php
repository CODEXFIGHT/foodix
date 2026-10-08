<?php
/**
 * RestaurOS — Sistema de gestión para restaurantes
 * Conexión PDO a la base de datos MySQL.
 *
 * @package   RestaurOS
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// ── Configuración — ajusta estos valores antes de subir ──────────────────────
// Los valores literales son el default de producción; cada uno puede
// sobrescribirse por variable de entorno (ROS_DB_*), lo que permite apuntar a
// una base de datos de pruebas sin tocar este archivo (ver tests/bootstrap.php)
// y, en un hosting que lo soporte, sacar los secretos del código.
define('DB_HOST',     getenv('ROS_DB_HOST') ?: 'localhost');
define('DB_NAME',     getenv('ROS_DB_NAME') ?: 'tallerch_foodix');
define('DB_USER',     getenv('ROS_DB_USER') ?: 'tallerch_jimmy2');
define('DB_PASS',     getenv('ROS_DB_PASS') !== false ? getenv('ROS_DB_PASS') : '-ONgB=quK4+Y*Q%m');
define('JWT_SECRET',  getenv('ROS_JWT_SECRET') ?: 'devhivesoftwarejimmy91');
define('UPLOAD_PATH', dirname(__DIR__) . '/uploads/products/');
define('UPLOAD_URL',  'https://tallercheck.mx/foodix/api/uploads/products/');
// Comprobantes de pago SPEI (imágenes o PDF). Carpeta separada de los productos.
define('RECEIPT_UPLOAD_PATH', dirname(__DIR__) . '/uploads/receipts/');
define('RECEIPT_UPLOAD_URL',  'https://tallercheck.mx/foodix/api/uploads/receipts/');

// ── Web Push ─────────────────────────────────────────────────────────────────
// El backend solo recopila las suscripciones; el envío real (firmado VAPID) lo
// hace la capa Next.js. PUSH_NOTIFY_URL apunta a esa ruta y PUSH_INTERNAL_SECRET
// debe coincidir con la variable de entorno del mismo nombre en el front Next.
define('PUSH_NOTIFY_URL',      'https://foodixapp.vercel.app/api/push/notify-kitchen');
define('PUSH_INTERNAL_SECRET', 'dae409a2a7009fdbb1fa11a1bb46eee1ce6a43252b4e86e8fc30ab3670f2c010');

// ── WhatsApp (servicio) ──────────────────────────────────────────────────────
// El webhook de WhatsApp corre en la capa Next.js y persiste el estado
// conversacional (sesiones/carritos) llamando a /whatsapp/session aquí. Este
// secreto debe COINCIDIR con BACKEND_SERVICE_TOKEN en el .env de Next.js.
define('WA_SERVICE_SECRET', getenv('WA_SERVICE_SECRET') ?: '24c0f8d6a1e34b7f9c2d5e8a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0');

// ── IA (OpenRouter) ──────────────────────────────────────────────────────────
// Usada por /ordenes/parse-voz (comanda por voz del mesero) para interpretar
// lenguaje libre contra el catálogo real — mismo proveedor y patrón que
// lib/server/whatsappAI.ts en el front. Sin key configurada, el endpoint
// degrada a confianza 0 en vez de romper (ver routes/ordenes.php).
//
// La key real NUNCA se versiona: vive en config/secrets.local.php, un archivo
// ignorado por git que solo existe en el servidor (copia config/secrets.local.php.example,
// llena el valor real y súbelo por FTP/SSH — nunca por git).
if (file_exists(__DIR__ . '/secrets.local.php')) {
    require_once __DIR__ . '/secrets.local.php';
}
if (!defined('OPENROUTER_API_KEY')) {
    define('OPENROUTER_API_KEY', getenv('OPENROUTER_API_KEY') ?: '');
}

class Database {
    private static ?PDO $instance = null;

    public static function connect(): PDO {
        if (self::$instance === null) {
            $dsn = 'mysql:host=' . DB_HOST
                 . ';dbname='   . DB_NAME
                 . ';charset=utf8mb4';

            self::$instance = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);

            // Zona horaria de la sesión: Ciudad de México (UTC-06:00 todo el año
            // desde 2022; México ya no aplica horario de verano). Usamos offset
            // fijo en vez de 'America/Mexico_City' porque las tablas de zonas con
            // nombre suelen no estar cargadas en hosting compartido. Así NOW(),
            // CURDATE() y los DEFAULT CURRENT_TIMESTAMP quedan en hora local.
            self::$instance->exec("SET time_zone = '-06:00'");
        }
        return self::$instance;
    }
}
