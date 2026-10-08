<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Configuración de CORS y orígenes permitidos.
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

function setCorsHeaders(): void {
    $allowed = [
        'https://foodixapp.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    // Solo se aceptan: el dominio canónico, localhost (dev) y los despliegues
    // de PREVIEW del propio proyecto (prefijo "foodixapp-"). NO se permite
    // cualquier *.vercel.app: con Allow-Credentials: true eso dejaría que un
    // sitio atacante alojado en vercel.app hiciera peticiones cross-origin.
    $isAllowed = in_array($origin, $allowed, true)
        || preg_match('#^https://foodixapp-[a-z0-9\-]+\.vercel\.app$#', $origin);

    if ($isAllowed) {
        header("Access-Control-Allow-Origin: $origin");
    }

    header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-Uid, X-App-Version, X-Build-Number');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
