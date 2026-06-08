# 🧈 BUTTER ADMIN - Painel Administrativo

Painel web completo para gerenciar a plataforma Butter.

## 📦 O que está incluído

✅ **Dashboard** - Métricas e visão geral
✅ **Gestão de Usuários** - Banir, desbanir, deletar
✅ **Gestão de Lives** - Moderar, encerrar, deletar
✅ **Gestão Financeira** - Transações, saques, comissões
✅ **Configurações** - Categorias, comissão, regras

## 🚀 Instalação

### 1. Extrair arquivos
Extraia a pasta `butter-admin` para onde quiser:
```
C:\butter-admin\
```

### 2. Instalar dependências
Abra o terminal na pasta e rode:
```bash
cd butter-admin
npm install
```

### 3. Rodar em desenvolvimento
```bash
npm run dev
```

Vai abrir em: http://localhost:3000

## 🔑 Criar Usuário Admin

Para acessar o painel, você precisa criar um usuário admin no Firebase:

### Opção 1: Pelo Firebase Console

1. Abra: https://console.firebase.google.com
2. Vá em **Firestore Database**
3. Abra a collection **users**
4. Clique no seu usuário
5. Adicione o campo:
   - **Campo:** `isAdmin`
   - **Tipo:** `boolean`
   - **Valor:** `true`
6. Clique em **Salvar**

### Opção 2: Manualmente no código (primeira vez)

Crie um arquivo temporário para adicionar o admin:

```javascript
// addAdmin.js
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './src/firebase.js';

const userId = 'SEU_USER_ID_AQUI'; // ID do seu usuário no Firebase

await updateDoc(doc(db, 'users', userId), {
  isAdmin: true
});

console.log('Admin criado!');
```

Rode:
```bash
node addAdmin.js
```

## 🎯 Como Usar

### Login
1. Acesse http://localhost:3000/login
2. Use o email/senha do usuário que você marcou como admin
3. Se não for admin, vai dar erro!

### Dashboard
- Veja métricas gerais
- Usuários recentes
- Lives recentes
- Receita total

### Usuários
- **Buscar:** Digite nome ou email
- **Ver detalhes:** Clique no ícone de olho
- **Banir/Desbanir:** Clique no ícone de ban
- **Deletar:** Clique no ícone de lixeira (⚠️ irreversível)

### Lives
- **Filtrar:** Por status (todas, ao vivo, agendadas, encerradas)
- **Buscar:** Por título ou criador
- **Encerrar:** Lives ao vivo podem ser encerradas
- **Deletar:** Remove a live (⚠️ irreversível)

### Financeiro
- **Receita Total:** Soma de todas as lives
- **Comissão:** 20% sobre cada transação
- **Saques Pendentes:** Aprovar ou rejeitar
- **Histórico:** Todas as transações

### Configurações
- **Comissão da plataforma:** Alterar percentual (padrão 20%)
- **Saque mínimo:** Valor mínimo para saque (padrão R$ 50)
- **Categorias:** Adicionar ou remover categorias de lives
- **Versão do app:** Informar versão atual

## 🎨 Estrutura de Pastas

```
butter-admin/
├── public/
├── src/
│   ├── components/
│   │   └── Layout.jsx          # Layout com sidebar
│   ├── pages/
│   │   ├── Login.jsx           # Tela de login
│   │   ├── Dashboard.jsx       # Dashboard principal
│   │   ├── Users.jsx           # Gestão de usuários
│   │   ├── Lives.jsx           # Gestão de lives
│   │   ├── Financial.jsx       # Gestão financeira
│   │   └── Settings.jsx        # Configurações
│   ├── App.jsx                 # App principal com rotas
│   ├── firebase.js             # Config Firebase
│   ├── index.css               # Estilos globais
│   └── main.jsx                # Entry point
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🔥 Deploy (Produção)

### Opção 1: Vercel (Recomendado)

1. Instale a Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
npm run build
vercel --prod
```

### Opção 2: Netlify

1. Instale Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Deploy:
```bash
npm run build
netlify deploy --prod
```

### Opção 3: Firebase Hosting

1. Instale Firebase CLI:
```bash
npm i -g firebase-tools
```

2. Configure:
```bash
firebase init hosting
```

3. Build e deploy:
```bash
npm run build
firebase deploy
```

## ⚠️ Importante - Segurança

### Regras do Firestore
Certifique-se de que suas regras permitem apenas admins:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Settings - apenas admins
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Users - admins podem tudo
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null;
      allow update, delete: if request.auth != null && 
                               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 🐛 Problemas Comuns

### "Cannot find module 'react'"
```bash
npm install
```

### "Port 3000 already in use"
```bash
npm run dev -- --port 3001
```

### "Firebase not initialized"
Verifique se o arquivo `src/firebase.js` tem as credenciais corretas.

### "Não consigo fazer login como admin"
Certifique-se de que o campo `isAdmin: true` existe no seu usuário no Firestore.

## 📱 Responsivo

O admin é responsivo e funciona bem em:
- ✅ Desktop (recomendado)
- ✅ Tablet
- ⚠️ Mobile (funciona mas não é ideal)

## 🎯 Funcionalidades Futuras (Sugestões)

- [ ] Notificações em tempo real
- [ ] Exportar relatórios em PDF/Excel
- [ ] Gráficos avançados (receita por mês, etc)
- [ ] Sistema de permissões (admin, moderador, suporte)
- [ ] Chat com usuários
- [ ] Logs de ações
- [ ] Backup automático

## 💡 Dicas

1. **Múltiplos admins:** Adicione `isAdmin: true` em vários usuários
2. **Moderação:** Use a página de Lives para moderar conteúdo
3. **Financeiro:** Aprove saques manualmente para evitar fraudes
4. **Categorias:** Ajuste conforme o nicho da sua plataforma

## 🆘 Suporte

Se tiver problemas:
1. Verifique o console do navegador (F12)
2. Verifique se o Firebase está configurado
3. Verifique se você é admin no Firestore

## 📄 Licença

Projeto Butter - Todos os direitos reservados
