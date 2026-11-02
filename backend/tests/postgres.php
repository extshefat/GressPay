<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';

function check(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException($message);
    echo "PASS {$message}\n";
}
if (($argv[1] ?? '') === 'claim') {
    $row = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?', [$argv[2]]);
    $sms = GpDb::one('SELECT * FROM gp_sms_data WHERE id = ?', [$argv[3]]);
    $method = GpDb::one('SELECT * FROM gp_methods WHERE brand_id = ? AND code = ?', [$row['brand_id'], 'bkash']);
    usleep(200000);
    CheckoutController::markPaid($row, $sms['trx_id'], 'bkash', $method, '100', 'BDT', $sms);
    exit;
}
check(GpDb::driver() === 'pgsql', 'suite uses real PostgreSQL');
$now = GpIds::now();
$merchant = GpIds::make('m', 6); $brand = GpIds::make('b', 6);
GpDb::exec('INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)', [$merchant, 'PG integration', $merchant.'@test.invalid', password_hash('test', PASSWORD_BCRYPT), 'active', $now, $now]);
GpDb::exec('INSERT INTO gp_brands (brand_id,merchant_id,name,currency_code,timezone,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [$brand,$merchant,'PG test','BDT','Asia/Dhaka',$now,$now]);
GpDb::exec('INSERT INTO gp_methods (brand_id,code,status,options,created_at,updated_at) VALUES (?,?,?,?,?,?)', [$brand,'bkash','active','{}',$now,$now]);
$trx = 'PG'.strtoupper(bin2hex(random_bytes(5)));
GpDb::exec('INSERT INTO gp_sms_data (brand_id,sender_key,amount,trx_id,received_at,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [$brand,'bkash','100',$trx,$now,'approved',$now,$now]);
$sms = GpDb::one('SELECT * FROM gp_sms_data WHERE brand_id = ? AND trx_id = ?', [$brand,$trx]);
check(CheckoutController::matchingSms($brand,strtolower($trx),'100','bkash') !== null,'normalized TxID fallback matches');
check(CheckoutController::matchingSms($brand,$trx,'50','bkash') === null,'equal amount required');
check(CheckoutController::matchingSms('other-brand',$trx,'100','bkash') === null,'cross-brand receipt rejected');
$duplicate = false;
try { GpDb::exec('INSERT INTO gp_sms_data (brand_id,sender_key,amount,trx_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)',[$brand,'bkash','100',strtolower($trx),'approved',$now,$now]); } catch (PDOException $e) { $duplicate = true; }
check($duplicate,'database rejects normalized duplicate evidence');
$sessions = [GpIds::make('chs',6), GpIds::make('chs',6)];
foreach ($sessions as $id) GpDb::exec('INSERT INTO gp_transactions (session_id,brand_id,source,amount,currency,ledger_mode,method_code,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [$id,$brand,'api','100','BDT','live','bkash','pending',gmdate('Y-m-d\TH:i:s\Z',time()+1800),$now,$now]);
$processes = [];
foreach ($sessions as $id) $processes[] = proc_open([PHP_BINARY,__FILE__,'claim',$id,(string)$sms['id']], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes);
foreach ($processes as $process) proc_close($process);
$count = (int) GpDb::one("SELECT COUNT(*) AS c FROM gp_transactions WHERE brand_id = ? AND status = 'completed'",[$brand])['c'];
check($count === 1,'concurrent equal-amount orders claim one receipt exactly once');
check(GpDb::one('SELECT status FROM gp_sms_data WHERE id = ?',[$sms['id']])['status'] === 'used','receipt claim committed atomically');
echo "PostgreSQL integration checks completed\n";
