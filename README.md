# Calc Hub

An all-in-one calculator web app (pure HTML/CSS/JS, no build step, no dependencies).

| Tab | What it does |
|---|---|
| Scientific | Expression parser (no `eval`): `+ - * / ^ ! %`, sin/cos/tan + inverses, sinh/cosh/tanh, log, ln, sqrt, cbrt, nCr, nPr, pi, e, `ans`, DEG/RAD, memory keys, history, keyboard input |
| Mortgage | Monthly payment, tax/insurance/HOA, extra payments (interest + time saved), LTV, chart, full amortization table |
| Loan EMI | Monthly EMI, total interest, total payment |
| SIP | Future value of monthly investments |
| Compound | Compound interest with monthly additions, chart |
| GST / VAT | Inclusive/exclusive, CGST/SGST split |
| BMI | BMI, category, healthy weight range |
| Percentage | A% of B, A is what % of B, % change |
| Units | Length, weight, volume, area, speed, data, temperature |
| Dates | Difference between two dates |

## Project layout

```
index.html            page structure
style.css             light/dark theme
calc.js               all calculation logic (also loaded by Node for tests)
app.js                UI wiring
test.js               automated tests:  node test.js
nginx-calc-hub.conf   nginx site config for the server
deploy.sh             pull + test + publish on the server
```

## Try it locally first

```bash
node test.js                 # should print: 44 passed, 0 failed
python3 -m http.server 8000  # then open http://localhost:8000
```

---

## Part 1: Put the code on GitHub (on your own computer)

1. Install Git (https://git-scm.com/downloads) and create a free GitHub account.
2. Tell Git who you are (one time):
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
3. Create an **empty** repo on GitHub: click **+ > New repository**, name it `calc-hub`, choose **Public** (makes the server clone step easy), and do **not** tick "Add a README".
4. In the project folder:
   ```bash
   cd calc-hub
   git init -b main
   git add .
   git commit -m "Initial commit: Calc Hub"
   git remote add origin https://github.com/<your-username>/calc-hub.git
   git push -u origin main
   ```
5. When asked for a password, GitHub no longer accepts your account password. Use a **Personal Access Token**: GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic) > Generate, tick `repo`, copy it, and paste it as the password. (Alternative: install the GitHub CLI and run `gh auth login`.)
6. Refresh the repo page. You should see all the files.

## Part 2: Create the Oracle Cloud VM (Always Free)

1. In the OCI console: **Compute > Instances > Create instance**.
2. **Image**: Canonical Ubuntu 22.04 or 24.04.
3. **Shape**: choose one that shows the **Always Free-eligible** label: `VM.Standard.E2.1.Micro` (AMD) or `VM.Standard.A1.Flex` (Arm, 1 OCPU / 6 GB is plenty). If capacity is unavailable, try another availability domain or try again later.
4. **Networking**: keep the default VCN/public subnet and make sure **Assign a public IPv4 address** is on.
5. **SSH keys**: choose **Generate a key pair** and download the private key (`ssh-key-....key`). Keep it safe; it cannot be downloaded again.
6. Click **Create**, wait for status **Running**, and copy the **Public IP address**.

### Open port 80 in the cloud firewall (Security List)
1. Instance page > click the **Subnet** > click the **Default Security List**.
2. **Add Ingress Rules**: Source CIDR `0.0.0.0/0`, IP Protocol `TCP`, Destination Port `80`. Add another for port `443` if you plan to use HTTPS later.

## Part 3: Connect and set up the server

From your computer (Linux/macOS/Windows PowerShell):

```bash
chmod 400 ~/Downloads/ssh-key-*.key        # not needed on Windows
ssh -i ~/Downloads/ssh-key-XXXX.key ubuntu@<PUBLIC_IP>
```

On the server:

```bash
sudo apt update && sudo apt install -y nginx git nodejs

# Ubuntu images on Oracle Cloud also have a host firewall (iptables). Open port 80 there too:
sudo iptables -I INPUT 1 -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 443 -m conntrack --ctstate NEW -j ACCEPT
sudo apt install -y iptables-persistent     # answer Yes to save current rules
sudo netfilter-persistent save
```

> Opening the port in only one of the two places (Security List **and** iptables) is the #1 reason the page does not load on Oracle Cloud.

## Part 4: Pull from GitHub and run

```bash
cd ~
git clone https://github.com/<your-username>/calc-hub.git
cd calc-hub

# Install the nginx site config
sudo cp nginx-calc-hub.conf /etc/nginx/sites-available/calc-hub
sudo ln -sf /etc/nginx/sites-available/calc-hub /etc/nginx/sites-enabled/calc-hub
sudo rm -f /etc/nginx/sites-enabled/default

# Publish the app (pulls, tests, copies files, reloads nginx)
chmod +x deploy.sh
./deploy.sh
```

Open `http://<PUBLIC_IP>` in your browser. You should see Calc Hub.

(If your repo is private, clone with `https://<username>:<token>@github.com/<username>/calc-hub.git`, or set up an SSH deploy key.)

## Part 5: Test it

**On the server**
```bash
node ~/calc-hub/test.js                    # 44 passed, 0 failed
sudo systemctl status nginx                # active (running)
curl -I http://localhost                   # HTTP/1.1 200 OK
curl -s http://localhost | grep -i "<title>"
curl -I http://localhost/calc.js           # 200 and Content-Type: application/javascript
```

**From your computer**
```bash
curl -I http://<PUBLIC_IP>                 # 200 OK means firewall + nginx are both fine
```

**In the browser (manual checklist)**

| Test | Expected |
|---|---|
| Scientific: `sin(30)` then `=` | `0.5` |
| Scientific: `2^10/5!` | `8.5333333333` |
| Scientific: switch DEG to RAD, `sin(pi/2)` | `1` |
| Scientific: `1/0` | red error, no crash |
| Mortgage: defaults (500k price, 100k down, 6.5%, 30 yr) | about 2,528.27 / month, total interest about 510,178 |
| Mortgage: extra payment 500 | payoff time shrinks, "Interest saved" appears |
| Loan EMI: 1,000,000 / 9% / 120 months | about 12,667.58 |
| Compound: 10,000 / 7% / 10 yr / 0 monthly | about 20,096.61 |
| Units: 1 mi to km | 1.609344 |
| Theme button | toggles dark/light and remembers it after refresh |
| Phone browser | layout fits, tabs scroll sideways |

**Optional load test** (from the server): `sudo apt install -y apache2-utils && ab -n 2000 -c 50 http://localhost/`

## Part 6: Update workflow (the real-world loop)

On your computer: edit code, then
```bash
git add . && git commit -m "Describe change" && git push
```
On the server:
```bash
cd ~/calc-hub && ./deploy.sh
```
Hard-refresh the browser (Ctrl+Shift+R) to bypass the 1-hour cache on CSS/JS.

## Troubleshooting

| Symptom | Check |
|---|---|
| Page times out | Security List ingress rule for port 80, and the iptables rule (Part 3). Verify with `sudo iptables -L INPUT -n --line-numbers` |
| `403` / `404` | `ls /var/www/calc-hub` should list index.html; re-run `./deploy.sh` |
| Default nginx welcome page shows | `sudo rm /etc/nginx/sites-enabled/default && sudo systemctl reload nginx` |
| `nginx -t` fails | Read the error line; usually a typo in the copied config |
| Logs | `sudo tail -f /var/log/nginx/error.log /var/log/nginx/access.log` |
| `git pull` asks for credentials | Repo is private; use a token or make it public |
| Out of capacity creating the VM | Try the other shape, another availability domain, or retry later |

## Good habits on the Free Tier
- Stay on **Always Free-eligible** shapes; don't click "upgrade" unless you intend to pay.
- Never commit `.pem`/`.key` files (the `.gitignore` already blocks them).
- For HTTPS later: point a domain at the public IP, then `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d yourdomain.com`.
- Calculators here are estimates, not financial advice.
