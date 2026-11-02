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
check(CheckoutController::matchingSmsByAmount($brand,'100','bkash') === null,'ambiguous equal-amount sessions require TxID fallback');
foreach ($sessions as $id) $processes[] = proc_open([PHP_BINARY,__FILE__,'claim',$id,(string)$sms['id']], [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']], $pipes);
foreach ($processes as $process) proc_close($process);
$count = (int) GpDb::one("SELECT COUNT(*) AS c FROM gp_transactions WHERE brand_id = ? AND status = 'completed'",[$brand])['c'];
check($count === 1,'concurrent equal-amount orders claim one receipt exactly once');
check(GpDb::one('SELECT status FROM gp_sms_data WHERE id = ?',[$sms['id']])['status'] === 'used','receipt claim committed atomically');
$delayedId = GpIds::make('chs',6); $delayedTrx = 'PG'.strtoupper(bin2hex(random_bytes(5)));
$opened = gmdate('Y-m-d\TH:i:s\Z',time()-7200); $received = gmdate('Y-m-d\TH:i:s\Z',time()-3600);
GpDb::exec('INSERT INTO gp_transactions (session_id,brand_id,source,amount,currency,ledger_mode,method_code,status,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [$delayedId,$brand,'api','100','BDT','live','bkash','pending',gmdate('Y-m-d\TH:i:s\Z',time()+600),$opened,$now]);
GpDb::exec('INSERT INTO gp_sms_data (brand_id,sender_key,amount,trx_id,received_at,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',[$brand,'bkash','100',$delayedTrx,$received,'approved',$now,$now]);
$late = GpDb::one('SELECT * FROM gp_sms_data WHERE brand_id = ? AND trx_id = ?',[$brand,$delayedTrx]);
$method = GpDb::one('SELECT * FROM gp_methods WHERE brand_id = ? AND code = ?',[$brand,'bkash']);
$delayed = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?',[$delayedId]);
check(CheckoutController::markPaid($delayed,$delayedTrx,'bkash',$method,'100','BDT',$late)['status'] === 'completed','offline delayed upload uses original receipt time within open session');
$expired = $delayed; $expired['session_id'] = GpIds::make('chs',6); $expired['status'] = 'pending';
$expired['expires_at'] = gmdate('Y-m-d\TH:i:s\Z',time()-4000);
check(CheckoutController::markPaid($expired,$delayedTrx,'bkash',$method,'100','BDT',$late)['status'] === 'pending','receipt outside payment window cannot settle expired checkout');
echo "PostgreSQL integration checks completed\n";
putenv('GRESSPAY_SMS_AUTO_ALLOWED=1'); $_ENV['GRESSPAY_SMS_AUTO_ALLOWED'] = '1';
GpConfig::load();
GpDb::exec('UPDATE gp_brands SET verification_mode = ? WHERE brand_id = ?', ['sms_auto',$brand]);
$phoneId = GpIds::make('chs',6); $phoneTrx = 'PG'.strtoupper(bin2hex(random_bytes(5)));
GpDb::exec('INSERT INTO gp_transactions (session_id,brand_id,source,amount,currency,ledger_mode,method_code,status,metadata,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[$phoneId,$brand,'api','100','BDT','live','bkash','pending',json_encode(['sender_number'=>'01712345678']),gmdate('Y-m-d\TH:i:s\Z',time()+600),$now,$now]);
GpDb::exec('INSERT INTO gp_sms_data (brand_id,sender_key,amount,trx_id,received_at,payer_phone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)',[$brand,'bkash','100',$phoneTrx,$now,'01812345678','approved',$now,$now]);
$phoneRow = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?',[$phoneId]);
$phoneSms = GpDb::one('SELECT * FROM gp_sms_data WHERE brand_id = ? AND trx_id = ?',[$brand,$phoneTrx]);
check(CheckoutController::markPaid($phoneRow,$phoneTrx,'bkash',$method,'100','BDT',$phoneSms)['status'] === 'pending','wrong payer phone cannot complete phone verification');
check(GpDb::one('SELECT status FROM gp_sms_data WHERE id = ?',[$phoneSms['id']])['status'] === 'approved','wrong payer phone leaves evidence unused');
GpDb::exec('UPDATE gp_transactions SET metadata = ? WHERE session_id = ?',[json_encode(['sender_number'=>'01812345678']),$phoneId]);
$phoneRow = GpDb::one('SELECT * FROM gp_transactions WHERE session_id = ?',[$phoneId]);
check(CheckoutController::markPaid($phoneRow,$phoneTrx,'bkash',$method,'100','BDT',$phoneSms)['status'] === 'completed','matching payer phone and trusted receipt can settle correct order');
putenv('GRESSPAY_SMS_AUTO_ALLOWED=0'); $_ENV['GRESSPAY_SMS_AUTO_ALLOWED'] = '0';
