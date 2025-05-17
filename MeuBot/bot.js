console.log("Bot iniciado!");

const { Client } = require('whatsapp-web.js');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Conectar ao banco de dados
const db = new sqlite3.Database('./bot.db');

// Criar tabela para armazenar dados de análise
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS analytics (
            id INTEGER PRIMARY KEY,
            user_id TEXT,
            command TEXT,
            timestamp TEXT
        )
    `);
});

// Definir usuários
let users = {};
try {
    users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
} catch (err) {
    console.error("Erro ao carregar users.json:", err);
    users = {};
}

// Salvar usuários
function saveUsers() {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

// Função para registrar dados de análise
function registerAnalytics(userId, command) {
    const timestamp = new Date().toISOString();
    db.run('INSERT INTO analytics (user_id, command, timestamp) VALUES (?, ?, ?)', [userId, command, timestamp], (err) => {
        if (err) console.error("Erro ao registrar análise:", err);
    });

    // Subir ranque
    if (users[userId]) {
        db.get('SELECT COUNT(*) as count FROM analytics WHERE user_id = ?', [userId], (err, row) => {
            if (!err && row) {
                const mensagensEnviadas = row.count || 0;
                if (mensagensEnviadas >= 100 && users[userId].rank === 'membro') {
                    users[userId].rank = 'avançado';
                    saveUsers();
                    client.sendMessage(userId, 'Você subiu de ranque! Novo ranque: Avançado');
                } else if (mensagensEnviadas >= 300 && users[userId].rank === 'avançado') {
                    users[userId].rank = 'experiente';
                    saveUsers();
                    client.sendMessage(userId, 'Você subiu de ranque! Novo ranque: Experiente');
                }
            }
        });
    }
}

// Criar cliente
const client = new Client();

client.on('qr', (qr) => {
    console.log('QR Code gerado:', qr);
});

client.on('ready', () => {
    console.log('Cliente pronto!');
});

// Definir admins
const admins = ['5524981411024', 'admin2']; // Adicione os números dos administradores aqui

// Comandos
client.on('message', async (message) => {
    try {
        const text = message.body.toLowerCase();
        const number = message.from;

        // Registrar dados de análise
        if (text.startsWith('!')) {
            registerAnalytics(number, text.split(' ')[0]);
        }

        // Menu
        if (text === '!menu') {
            let menu = "*Menu*\n\n";
            menu += `*Nome:* ${users[number]?.name || 'Usuário'}\n`;
            menu += `*Código:* ${number}\n`;
            menu += `*Perfil:* ${users[number]?.rank || 'membro'}\n`;
            menu += "*Comandos disponíveis:*\n";
            menu += "!figurinha - Crie uma figurinha a partir de uma imagem\n";
            menu += "!jogar - Jogue o Jogo da Velha\n";
            menu += "!nome <novo_nome> - Altere seu nome\n";
            menu += "!info - Ver informações do usuário\n";
            if (admins.includes(number)) {
                menu += "!nomebot <novo_nome> - Altere o nome do bot\n";
                menu += "!baixarranque <número> - Baixe o ranque de um usuário\n";
                menu += "!verdenuncias - Ver denúncias\n";
            }
            client.sendMessage(message.from, menu);
        }

        // Ver informações do usuário
        if (text === '!info') {
            const user = users[number];
            if (user) {
                db.get('SELECT COUNT(*) as count FROM analytics WHERE user_id = ?', [number], (err, row) => {
                    if (!err && row) {
                        let info = "*Informações do usuário*\n\n";
                        info += `*Nome:* ${user.name}\n`;
                        info += `*Ranque:* ${user.rank}\n`;
                        info += `*Mensagens enviadas:* ${row.count || 0}\n`;
                        info += "*Comandos disponíveis:*\n";
                        info += "!figurinha, !jogar, !nome <novo_nome>, !info\n";
                        if (admins.includes(number)) {
                            info += "*Comandos de administrador:*\n";
                            info += "!nomebot, !baixarranque, !verdenuncias\n";
                        }
                        client.sendMessage(message.from, info);
                    }
                });
            }
        }

    } catch (err) {
        console.error("Erro ao processar mensagem:", err);
    }
});

client.initialize();
