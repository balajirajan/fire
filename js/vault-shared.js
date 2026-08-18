// Shared engine for the Document Vault section (vault-overview.html,
// vault-bank-locker.html, vault-property.html, vault-bonds.html,
// vault-government.html, vault-vehicle.html, vault-education.html,
// vault-insurance.html, vault-legal.html).
//
// Every vault page shares ONE passphrase/encryption key (there's a single
// vault_key_verifier row per user, not one per category) — files are
// encrypted client-side with AES-256-GCM before upload, so this file is the
// single source of truth for that crypto, to avoid subtle inconsistencies
// across nine near-identical pages. The derived key lives only in the
// `vaultKey` variable below (never persisted), so navigating between vault
// pages requires re-entering the passphrase each time — that's intentional,
// not a bug: persisting the key anywhere would weaken the encryption model.

var vaultKey = null;

/* ── Crypto helpers (Web Crypto API — AES-256-GCM, key via PBKDF2) ─────── */

function vaultBufToBase64(buf) {
  var bytes = new Uint8Array(buf);
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function vaultBase64ToBytes(b64) {
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function vaultDeriveKey(passphrase, saltB64) {
  var salt = vaultBase64ToBytes(saltB64);
  var enc = new TextEncoder();
  var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function vaultEncryptBytes(key, bytes) {
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes);
  var combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return combined;
}

async function vaultDecryptBytes(key, combinedBytes) {
  var iv = combinedBytes.slice(0, 12);
  var ciphertext = combinedBytes.slice(12);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
}

/* ── Lock / unlock — expects the standard lock-screen DOM ids to exist on ── */
/* ── the page: lockedView, lockedTitle, lockedSub, vaultError,            ── */
/* ── passphraseInput, passphraseConfirmInput, setupWarning, unlockBtn,    ── */
/* ── unlockedView.                                                        ── */

async function vaultCheckSetup() {
  var { data, error } = await supabaseClient.from('vault_key_verifier').select('*').maybeSingle();
  if (error) { console.error('Could not check vault setup', error); return null; }
  return data;
}

function vaultShowSetupUI() {
  document.getElementById('lockedTitle').textContent = 'Set Up Your Vault';
  document.getElementById('lockedSub').textContent = 'Choose a passphrase to encrypt your documents. This is separate from your FinFlow login, and is shared across every Document Vault category.';
  document.getElementById('passphraseConfirmInput').style.display = 'block';
  document.getElementById('setupWarning').style.display = 'block';
  document.getElementById('unlockBtn').textContent = 'Create Vault';
}

function vaultShowUnlockUI() {
  document.getElementById('lockedTitle').textContent = 'Vault Locked';
  document.getElementById('lockedSub').textContent = 'Enter your vault passphrase to view your documents.';
  document.getElementById('passphraseConfirmInput').style.display = 'none';
  document.getElementById('setupWarning').style.display = 'none';
  document.getElementById('unlockBtn').textContent = 'Unlock Vault';
}

async function vaultHandleUnlockClick(verifierRow, onUnlocked) {
  var errEl = document.getElementById('vaultError');
  errEl.textContent = '';
  var passphrase = document.getElementById('passphraseInput').value;

  if (!passphrase || passphrase.length < 6) { errEl.textContent = 'Passphrase must be at least 6 characters.'; return; }

  if (!verifierRow) {
    var confirmPass = document.getElementById('passphraseConfirmInput').value;
    if (passphrase !== confirmPass) { errEl.textContent = 'Passphrases do not match.'; return; }

    var salt = crypto.getRandomValues(new Uint8Array(16));
    var saltB64 = vaultBufToBase64(salt.buffer);
    var key = await vaultDeriveKey(passphrase, saltB64);
    var enc = new TextEncoder();
    var verifierBytes = await vaultEncryptBytes(key, enc.encode('FINFLOW_VAULT_OK'));
    var verifierB64 = vaultBufToBase64(verifierBytes.buffer);

    var { error } = await supabaseClient.from('vault_key_verifier').insert({ salt: saltB64, verifier: verifierB64 });
    if (error) { errEl.textContent = 'Could not set up vault. Please try again.'; console.error(error); return; }

    vaultKey = key;
    vaultUnlockSuccess(onUnlocked);
    return;
  }

  try {
    var key2 = await vaultDeriveKey(passphrase, verifierRow.salt);
    var combined = vaultBase64ToBytes(verifierRow.verifier);
    var plainBuf = await vaultDecryptBytes(key2, combined);
    var text = new TextDecoder().decode(plainBuf);
    if (text !== 'FINFLOW_VAULT_OK') throw new Error('mismatch');
    vaultKey = key2;
    vaultUnlockSuccess(onUnlocked);
  } catch (e) {
    errEl.textContent = 'Incorrect passphrase. Please try again.';
  }
}

function vaultUnlockSuccess(onUnlocked) {
  document.getElementById('passphraseInput').value = '';
  document.getElementById('lockedView').style.display = 'none';
  document.getElementById('unlockedView').style.display = 'block';
  if (onUnlocked) onUnlocked();
}

async function vaultWireLock(onUnlocked) {
  var verifierRow = await vaultCheckSetup();
  if (verifierRow) vaultShowUnlockUI(); else vaultShowSetupUI();
  document.getElementById('unlockBtn').addEventListener('click', function () { vaultHandleUnlockClick(verifierRow, onUnlocked); });
  document.getElementById('passphraseInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') vaultHandleUnlockClick(verifierRow, onUnlocked); });
  return verifierRow;
}

function vaultLockUI() {
  vaultKey = null;
  document.getElementById('unlockedView').style.display = 'none';
  document.getElementById('lockedView').style.display = 'block';
  document.getElementById('vaultError').textContent = '';
  document.getElementById('passphraseInput').value = '';
}

/* ── Generic encrypted document CRUD, filtered by category ─────────────── */

var VAULT_MAX_FILE_BYTES = 8 * 1024 * 1024;

async function vaultLoadDocuments(category) {
  var { data, error } = await supabaseClient.from('vault_documents').select('*').eq('category', category).order('created_at', { ascending: false });
  if (error) { console.error('Could not load vault documents', error); return []; }
  return data || [];
}

async function vaultUploadDocument(file, category, expiryDate, notes, userId) {
  if (file.size > VAULT_MAX_FILE_BYTES) throw new Error('File is too large (max 8 MB).');
  var arrayBuffer = await file.arrayBuffer();
  var encrypted = await vaultEncryptBytes(vaultKey, new Uint8Array(arrayBuffer));
  var path = userId + '/' + crypto.randomUUID() + '.enc';

  var { error: uploadErr } = await supabaseClient.storage.from('vault-documents').upload(path, encrypted, { contentType: 'application/octet-stream' });
  if (uploadErr) throw uploadErr;

  var { error: dbErr } = await supabaseClient.from('vault_documents').insert({
    category: category, file_name: file.name, storage_path: path, expiry_date: expiryDate || null, notes: notes || null
  });
  if (dbErr) throw dbErr;
}

async function vaultDownloadDocument(doc) {
  var { data, error } = await supabaseClient.storage.from('vault-documents').download(doc.storage_path);
  if (error) throw error;
  var arrayBuffer = await data.arrayBuffer();
  var decrypted = await vaultDecryptBytes(vaultKey, new Uint8Array(arrayBuffer));
  var blob = new Blob([decrypted]);
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = doc.file_name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function vaultDeleteDocument(doc) {
  await supabaseClient.storage.from('vault-documents').remove([doc.storage_path]);
  await supabaseClient.from('vault_documents').delete().eq('id', doc.id);
}

/* ── Small display helpers ──────────────────────────────────────────────── */

function vaultEscapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function vaultDaysUntil(dateStr) {
  if (!dateStr) return null;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function vaultExpiryPillHtml(dateStr) {
  var days = vaultDaysUntil(dateStr);
  if (days === null) return '';
  if (days < 0) return '<span class="expiry-pill expired">Expired ' + Math.abs(days) + 'd ago</span>';
  if (days <= 30) return '<span class="expiry-pill soon">Expires in ' + days + 'd</span>';
  return '<span class="expiry-pill ok">Valid until ' + dateStr + '</span>';
}
