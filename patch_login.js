const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(/<div className="relative">\s*<div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">\s*<Lock className="w-5 h-5 text-slate-400" \/>\s*<\/div>\s*<input\s*type=\{showPassword \? "text" : "password"\}\s*placeholder="Password"/, 
  \`<div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"\`);

const insertForgotLink = \`
                </div>
                <div className="flex justify-end mt-2">
                  <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                
                {error && (
\`;

code = code.replace(/<\/button>\s*<\/div>\s*\{error && \(/, 
  \`</button>
                  \${insertForgotLink}\`);

fs.writeFileSync('src/pages/Login.tsx', code);
