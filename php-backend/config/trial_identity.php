<?php
/**
 * FoodIX — Sistema de gestión para restaurantes
 * Identidades del trial: normalización y hashing de correo, teléfono,
 * dispositivo e IP para el sistema antiabuso.
 *
 * PRIVACIDAD: ninguna de estas señales se guarda en claro en las tablas de
 * antiabuso (`trial_identities`, `trial_attempts`, `trial_rate_limits`). Todo
 * se almacena como HMAC-SHA256 con pepper del servidor, de modo que:
 *   · sirve para comparar "¿esta identidad ya usó un trial?"
 *   · no permite reconstruir el correo/teléfono/IP desde la base de datos
 *   · no se expone jamás al cliente
 *
 * @package   FoodIX
 * @author    Carlos Jaime López Martínez
 * @copyright 2026 DevHive Software. Todos los derechos reservados.
 * @license   Propietario — uso bajo licencia comercial.
 */
declare(strict_types=1);

// Pepper del hashing. Se puede fijar en config/secrets.local.php (recomendado
// en producción); si no existe, se deriva del JWT_SECRET para que el sistema
// funcione en el hosting compartido sin configuración adicional.
if (!defined('TRIAL_HASH_SECRET')) {
    define(
        'TRIAL_HASH_SECRET',
        getenv('TRIAL_HASH_SECRET')
            ?: hash('sha256', 'foodix-trial-identity|' . (defined('JWT_SECRET') ? JWT_SECRET : 'fallback'))
    );
}

/** Días que dura la prueba gratuita. Única fuente de verdad del backend. */
if (!defined('TRIAL_DAYS')) {
    define('TRIAL_DAYS', 14);
}

/** Prefijo telefónico por defecto cuando el usuario no escribe lada (México). */
if (!defined('TRIAL_DEFAULT_COUNTRY_CODE')) {
    define('TRIAL_DEFAULT_COUNTRY_CODE', '52');
}

/**
 * HMAC determinístico de una identidad. `$type` entra en el hash para que un
 * mismo valor no colisione entre espacios distintos (correo vs dispositivo).
 */
function trialHash(string $type, string $value): string {
    return hash_hmac('sha256', $type . ':' . $value, TRIAL_HASH_SECRET);
}

/**
 * Correo en su forma de almacenamiento: recortado y en minúsculas.
 * Es el valor que se guarda en `users.email` / `signups.email`.
 */
function normalizeEmail(string $email): string {
    return mb_strtolower(trim($email));
}

/**
 * Forma CANÓNICA del correo, solo para el hash antiabuso. Colapsa las variantes
 * que entregan al mismo buzón real y que se usan para pedir trials repetidos:
 *   · sub-direcciones  →  juan+trial2@gmail.com   ≡ juan@gmail.com
 *   · puntos en Gmail  →  j.u.a.n@gmail.com       ≡ juan@gmail.com
 *   · googlemail.com   →  juan@googlemail.com     ≡ juan@gmail.com
 *
 * NO se usa para iniciar sesión ni para enviar correo: ahí manda el valor real.
 */
function canonicalEmailForHash(string $email): string {
    $email = normalizeEmail($email);
    $at    = strrpos($email, '@');
    if ($at === false) return $email;

    $local  = substr($email, 0, $at);
    $domain = substr($email, $at + 1);

    // Sub-dirección: todo lo que va después de '+' es una etiqueta del usuario.
    $plus = strpos($local, '+');
    if ($plus !== false) {
        $local = substr($local, 0, $plus);
    }

    // Gmail ignora los puntos del local-part.
    if ($domain === 'gmail.com' || $domain === 'googlemail.com') {
        $local  = str_replace('.', '', $local);
        $domain = 'gmail.com';
    }

    return $local . '@' . $domain;
}

/** Hash antiabuso de un correo (sobre su forma canónica). */
function emailIdentityHash(string $email): string {
    return trialHash('email', canonicalEmailForHash($email));
}

/**
 * Normaliza un teléfono a E.164 (+525512345678). Devuelve null si no parece
 * un número marcable. Acepta espacios, guiones, paréntesis y prefijos 00/+.
 */
function normalizePhoneE164(string $phone, string $defaultCc = TRIAL_DEFAULT_COUNTRY_CODE): ?string {
    $raw = trim($phone);
    if ($raw === '') return null;

    $hasPlus = str_starts_with($raw, '+') || str_starts_with($raw, '00');
    $digits  = preg_replace('/\D+/', '', $raw) ?? '';

    if ($digits === '') return null;

    // 00 internacional → equivalente a '+'
    if (str_starts_with($raw, '00')) {
        $digits = substr($digits, 2);
    }

    if (!$hasPlus) {
        // Número nacional: se le antepone la lada del país por defecto.
        // México: el "1" histórico de celular (52 1 55 ...) ya no se usa en E.164.
        if ($defaultCc === '52' && strlen($digits) === 11 && str_starts_with($digits, '1')) {
            $digits = substr($digits, 1);
        }
        if (strlen($digits) <= 10) {
            $digits = $defaultCc . $digits;
        }
    } elseif ($defaultCc === '52' && strlen($digits) === 13 && str_starts_with($digits, '521')) {
        $digits = '52' . substr($digits, 3);
    }

    // E.164: de 8 a 15 dígitos, sin ceros a la izquierda.
    if (strlen($digits) < 8 || strlen($digits) > 15) return null;

    return '+' . $digits;
}

/** Hash antiabuso de un teléfono ya normalizado a E.164. */
function phoneIdentityHash(string $phoneE164): string {
    return trialHash('phone', $phoneE164);
}

/** IP del cliente respetando el proxy del hosting (X-Forwarded-For). */
function clientIp(): string {
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($fwd !== '') {
        $first = trim(explode(',', $fwd)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) return $first;
    }
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/** Hash antiabuso de la IP. La IP NUNCA se guarda en claro ni bloquea por sí sola. */
function ipIdentityHash(?string $ip = null): string {
    return trialHash('ip', $ip ?? clientIp());
}

/**
 * Identificador de dispositivo first-party. NO es fingerprinting: es un
 * identificador aleatorio generado por el SERVIDOR y guardado en una cookie
 * HttpOnly propia. Si el visitante la borra, simplemente se emite otro (el
 * bloqueo real se apoya en el teléfono verificado, no en esta señal).
 *
 * Devuelve el hash del identificador (lo único que se persiste).
 */
function resolveDeviceHash(?string $clientDeviceUid = null): string {
    $cookieName = 'ros_did';
    $did        = $_COOKIE[$cookieName] ?? '';

    if (!preg_match('/^[a-f0-9]{32}$/', (string)$did)) {
        $did = bin2hex(random_bytes(16));
        // El proxy /backend de Next.js reenvía la cookie al mismo origen del
        // front, así que basta con marcarla HttpOnly + Secure + SameSite=Lax.
        if (!headers_sent()) {
            setcookie($cookieName, $did, [
                'expires'  => time() + 63072000,  // 2 años
                'path'     => '/',
                'secure'   => ($_SERVER['HTTPS'] ?? '') !== '' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https',
                'httponly' => true,
                'samesite' => 'Lax',
            ]);
        }
        $_COOKIE[$cookieName] = $did;
    }

    // El device_uid que ya maneja la app (localStorage / APK nativa) se combina
    // con la cookie: así el borrado de UNA de las dos no reinicia la señal.
    $extra = trim((string)($clientDeviceUid ?? ($_SERVER['HTTP_X_DEVICE_UID'] ?? '')));
    $extra = preg_match('/^[A-Za-z0-9_\-]{6,128}$/', $extra) ? $extra : '';

    return trialHash('device', $did . '|' . $extra);
}

/**
 * Sugiere un username disponible a partir del nombre del negocio/persona.
 * Solo minúsculas, números, punto, guion y guion bajo (igual que /branches).
 */
function suggestUsername(PDO $db, string $base): string {
    $slug = strtolower(trim($base));
    $slug = preg_replace('/[áàäâ]/u', 'a', $slug) ?? $slug;
    $slug = preg_replace('/[éèëê]/u', 'e', $slug) ?? $slug;
    $slug = preg_replace('/[íìïî]/u', 'i', $slug) ?? $slug;
    $slug = preg_replace('/[óòöô]/u', 'o', $slug) ?? $slug;
    $slug = preg_replace('/[úùüû]/u', 'u', $slug) ?? $slug;
    $slug = str_replace('ñ', 'n', $slug);
    $slug = preg_replace('/[^a-z0-9]+/', '_', $slug) ?? $slug;
    $slug = trim($slug, '_');
    if (strlen($slug) < 3) $slug = 'usuario';
    $slug = substr($slug, 0, 40);

    $stmt      = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $candidate = $slug;
    for ($i = 1; $i <= 200; $i++) {
        $stmt->execute([$candidate]);
        if (!$stmt->fetch()) return $candidate;
        $candidate = $slug . $i;
    }
    return $slug . bin2hex(random_bytes(3));
}

/** Slug único de sucursal a partir del nombre del negocio. */
function suggestBranchSlug(PDO $db, string $businessName): string {
    $slug = strtolower(trim($businessName));
    $slug = strtr($slug, ['á'=>'a','é'=>'e','í'=>'i','ó'=>'o','ú'=>'u','ü'=>'u','ñ'=>'n']);
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? $slug;
    $slug = trim($slug, '-');
    if (strlen($slug) < 3) $slug = 'restaurante';
    $slug = substr($slug, 0, 50);

    $stmt      = $db->prepare('SELECT id FROM branches WHERE slug = ? LIMIT 1');
    $candidate = $slug;
    for ($i = 1; $i <= 200; $i++) {
        $stmt->execute([$candidate]);
        if (!$stmt->fetch()) return $candidate;
        $candidate = $slug . '-' . $i;
    }
    return $slug . '-' . bin2hex(random_bytes(3));
}
