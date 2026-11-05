<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
function mysql_check(bool $ok, string $name): void {
    if (!$ok) throw new RuntimeException($name);
    echo "PASS {$name}\n";
}
mysql_check(GpDb::driver()==='mysql','MySQL security checks use real MySQL');
$versions=GpDb::all('SELECT * FROM gp_schema_version ORDER BY version');
GpMigrations::run();
mysql_check($versions===GpDb::all('SELECT * FROM gp_schema_version ORDER BY version'),'MySQL migration runner is repeatable');
$bucket='mysql-'.bin2hex(random_bytes(8));
for ($n=0;$n<5;$n++) mysql_check(GpRateLimiter::hit($bucket,5,900),'MySQL upsert admits within limit');
mysql_check(!GpRateLimiter::hit($bucket,5,900),'MySQL upsert rejects excess');
$email=$bucket.'@test.local';
for ($n=0;$n<5;$n++) GpRateLimiter::loginFailed($email);
mysql_check(!GpRateLimiter::accountAllowed($email),'MySQL account failures enforce cooldown');
GpRateLimiter::loginSucceeded($email);
mysql_check(GpRateLimiter::accountAllowed($email),'MySQL successful login clears cooldown');
$trx='MYSQL'.strtoupper(bin2hex(random_bytes(8)));
GpDb::pdo()->beginTransaction();
mysql_check(GpTrxClaims::claim('mysql-test','live',$trx,'first'),'MySQL claims first receipt');
mysql_check(!GpTrxClaims::claim('mysql-test','live',strtolower($trx),'second'),'MySQL rejects duplicate receipt claim');
GpDb::pdo()->rollBack();
mysql_check(GpDb::one('SELECT session_id FROM gp_trx_claims WHERE trx_id = ?',[$trx])===null,'MySQL receipt claim rolls back with settlement');
echo "MySQL security checks completed\n";
