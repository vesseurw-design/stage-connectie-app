const fs = require('fs');
const path = require('path');

console.log('�� Post-build gestart...');

const buildDir = path.join(__dirname, 'build');
const backupDir = path.join(__dirname, 'backup_build');

// 1. Restore HTML files
console.log('Herstellen HTML bestanden...');
if (fs.existsSync(backupDir)) {
  const htmlFiles = ['index.html', 'login.html', 'admin-login.html', 'admin.html', 'admin-students.html', 'admin-companies.html', 'supervisor-login.html', 'supervisor-portal.html'];
  
  htmlFiles.forEach(file => {
    const backupFile = path.join(backupDir, file);
    const buildFile = path.join(buildDir, file);
    if (fs.existsSync(backupFile)) {
      fs.copyFileSync(backupFile, buildFile);
    }
  });
  console.log('✅ HTML bestanden hersteld');
} else {
  console.log('ℹ️  Backup build directory niet gevonden');
}

// 2. Restore JS files
console.log('Herstellen JS bestanden...');
const staticJs = path.join(buildDir, 'static', 'js');
if (!fs.existsSync(staticJs)) {
  fs.mkdirSync(staticJs, { recursive: true });
}

const backupJsDir = path.join(backupDir, 'static', 'js');
if (fs.existsSync(backupJsDir)) {
  const jsFiles = fs.readdirSync(backupJsDir);
  jsFiles.forEach(file => {
    fs.copyFileSync(path.join(backupJsDir, file), path.join(staticJs, file));
  });
  console.log('✅ JS bestanden hersteld');
} else {
  console.log('ℹ️  Backup JS directory niet gevonden');
}

console.log('✅ Post-build voltooid!');
