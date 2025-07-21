import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, setDoc, getDoc, where, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// Contexto para o Firebase e dados do usuário
const FirebaseContext = createContext(null);

// Componente principal da aplicação
const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    // O ID do usuário agora é fixo para todos, tornando a aplicação colaborativa.
    const [userId] = useState('00072718779172288554'); // Este é o ID do grupo colaborativo
    const [activeTab, setActiveTab] = useState('overview'); // Estado para a aba ativa
    const [isAuthReady, setIsAuthReady] = useState(false); // Estado para verificar se a autenticação está pronta
    const [error, setError] = useState(null); // Estado de erro
    const [darkMode, setDarkMode] = useState(false); // Novo estado para o modo escuro

    useEffect(() => {
        try {
            // Variáveis globais fornecidas pelo ambiente Canvas
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

            if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
                console.error("Firebase config is missing.");
                setError("Configuração do Firebase ausente. Por favor, verifique.");
                setIsAuthReady(true); // Para o carregamento
                return;
            }

            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Listener para o estado de autenticação
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    // Usuário está autenticado, a aplicação pode prosseguir.
                    setIsAuthReady(true);
                } else {
                    // Nenhum usuário, tenta fazer o login anônimo ou com token.
                    try {
                        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                        // onAuthStateChanged será chamado novamente após o login bem-sucedido,
                        // e então setIsAuthReady(true) será executado.
                    } catch (e) {
                        console.error("Erro ao autenticar no Firebase:", e);
                        setError("Erro ao autenticar. Por favor, tente novamente.");
                        setIsAuthReady(true); // Para o carregamento mesmo em caso de erro.
                    }
                }
            });

            return () => unsubscribe(); // Limpa o listener ao desmontar
        } catch (e) {
            console.error("Erro na inicialização do Firebase:", e);
            setError("Erro ao inicializar o aplicativo. Por favor, recarregue.");
            setIsAuthReady(true); // Para o carregamento
        }
    }, []);

    // Mostra a tela de carregamento até que a autenticação esteja pronta
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Autenticando...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700 p-4 rounded-lg">
                <div className="text-xl font-semibold">{error}</div>
            </div>
        );
    }

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <FirebaseContext.Provider value={{ db, auth, userId, darkMode }}>
            <div className={`min-h-screen font-inter ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900'}`}>
                <div className={`max-w-4xl mx-auto rounded-2xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <header className={`p-4 sm:p-6 text-white text-center rounded-t-2xl ${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-600 to-indigo-700'}`}>
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Controle Financeiro</h1>
                        <p className="text-lg opacity-90">Organize suas finanças juntos!</p>
                        {userId && (
                            <p className="text-sm mt-2 opacity-80">ID do Grupo: {userId}</p>
                        )}
                    </header>

                    <nav className={`border-b flex flex-wrap justify-center p-2 sm:p-3 gap-1 sm:gap-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                        {['overview', 'incomes', 'expenses', 'categories', 'goals', 'initialBalance', 'users', 'summary'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ease-in-out
                                    ${activeTab === tab
                                        ? (darkMode ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-500 text-white shadow-md')
                                        : (darkMode ? 'text-gray-300 hover:bg-gray-600 hover:text-blue-400' : 'text-gray-700 hover:bg-gray-200 hover:text-blue-700')
                                    }`}
                            >
                                {tab === 'overview' && 'Visão Geral'}
                                {tab === 'incomes' && 'Entradas'}
                                {tab === 'expenses' && 'Saídas'}
                                {tab === 'categories' && 'Categorias'}
                                {tab === 'goals' && 'Metas'}
                                {tab === 'initialBalance' && 'Saldo Inicial'}
                                {tab === 'users' && 'Usuários'}
                                {tab === 'summary' && 'Resumo'}
                            </button>
                        ))}
                        <button
                            onClick={toggleDarkMode}
                            className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 ease-in-out
                                ${darkMode
                                    ? 'bg-yellow-500 text-gray-900 shadow-md'
                                    : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                        >
                            {darkMode ? 'Modo Claro' : 'Modo Escuro'}
                        </button>
                    </nav>

                    <main className={`p-4 sm:p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {activeTab === 'overview' && <Overview />}
                        {activeTab === 'incomes' && <IncomesSection />}
                        {activeTab === 'expenses' && <ExpensesSection />}
                        {activeTab === 'categories' && <CategoriesSection />}
                        {activeTab === 'goals' && <GoalsSection />}
                        {activeTab === 'initialBalance' && <InitialBalanceSection />}
                        {activeTab === 'users' && <UsersSection />}
                        {activeTab === 'summary' && <SummarySection />}
                    </main>
                </div>
            </div>
        </FirebaseContext.Provider>
    );
};

// Componente para a Visão Geral
const Overview = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [incomes, setIncomes] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [initialBalance, setInitialBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        const incomesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'incomes');
        const expensesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
        const initialBalanceDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'initialBalance');

        let initialDataLoaded = 0;
        const totalListeners = 3;
        const checkAllLoaded = () => {
            initialDataLoaded++;
            if (initialDataLoaded >= totalListeners) {
                setLoading(false);
            }
        };

        const unsubscribeIncomes = onSnapshot(query(incomesCollectionRef, orderBy('date', 'desc')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIncomes(data);
            checkAllLoaded();
        }, (error) => {
            console.error("Erro ao buscar entradas:", error);
            checkAllLoaded();
        });

        const unsubscribeExpenses = onSnapshot(query(expensesCollectionRef, orderBy('date', 'desc')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(data);
            checkAllLoaded();
        }, (error) => {
            console.error("Erro ao buscar saídas:", error);
            checkAllLoaded();
        });

        const unsubscribeInitialBalance = onSnapshot(initialBalanceDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setInitialBalance(docSnap.data().amount || 0);
            } else {
                setInitialBalance(0);
            }
            checkAllLoaded();
        }, (error) => {
            console.error("Erro ao buscar saldo inicial:", error);
            checkAllLoaded();
        });

        return () => {
            unsubscribeIncomes();
            unsubscribeExpenses();
            unsubscribeInitialBalance();
        };
    }, [db, userId]);

    const calculateMonthlySummary = () => {
        const summary = {};
        const allTransactions = [...incomes, ...expenses];

        allTransactions.forEach(transaction => {
            const date = transaction.date instanceof Timestamp
                             ? transaction.date.toDate()
                             : new Date(transaction.date);

            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

            if (!summary[monthYear]) {
                summary[monthYear] = { incomes: 0, expenses: 0, balance: 0 };
            }

            if (transaction.type === 'income') {
                summary[monthYear].incomes += transaction.amount;
            } else if (transaction.type === 'expense') {
                summary[monthYear].expenses += transaction.amount;
            }
        });

        const sortedMonths = Object.keys(summary).sort();
        let cumulativeBalance = initialBalance;

        return sortedMonths.map(monthYear => {
            const monthData = summary[monthYear];
            const monthDate = new Date(parseInt(monthYear.substring(0, 4)), parseInt(monthYear.substring(5, 7)) - 1);
            const monthName = monthDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            const netChange = monthData.incomes - monthData.expenses;
            cumulativeBalance += netChange;
            return {
                month: monthName,
                incomes: monthData.incomes,
                expenses: monthData.expenses,
                balance: cumulativeBalance
            };
        });
    };

    const monthlySummary = calculateMonthlySummary();

    if (loading) {
        return <div className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Carregando visão geral...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Visão Geral Mensal</h2>

            <div className={`p-4 rounded-lg shadow-inner ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
                <p className="text-lg font-semibold">Saldo Inicial: <span className="font-bold">R$ {initialBalance.toFixed(2)}</span></p>
            </div>

            {monthlySummary.length === 0 ? (
                <p className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhum dado financeiro registrado ainda. Comece adicionando entradas e saídas!</p>
            ) : (
                <div className={`overflow-x-auto rounded-lg shadow-md ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Mês</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Entradas (R$)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Saídas (R$)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Saldo (R$)</th>
                            </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'}`}>{
                            monthlySummary.map((data, index) => (
                                <tr key={index} className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'} capitalize`}>{data.month}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-500 font-semibold">R$ {data.incomes.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-500 font-semibold">R$ {data.expenses.toFixed(2)}</td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold ${data.balance >= 0 ? (darkMode ? 'text-blue-400' : 'text-blue-700') : (darkMode ? 'text-red-400' : 'text-red-700')}`}>R$ {data.balance.toFixed(2)}</td>
                                </tr>
                            ))
                        }</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// Componente para a seção de Entradas
const IncomesSection = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [transactionUser, setTransactionUser] = useState(''); // Novo estado para o usuário da transação
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [incomes, setIncomes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]); // Novo estado para usuários
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        const incomesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'incomes');
        const categoriesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
        const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users'); // Referência à coleção de usuários

        const unsubscribeIncomes = onSnapshot(query(incomesCollectionRef, orderBy('date', 'desc')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIncomes(data);
        }, (error) => {
            console.error("Erro ao buscar entradas:", error);
            setMessage('Erro ao carregar entradas.');
            setMessageType('error');
        });

        const unsubscribeCategories = onSnapshot(query(categoriesCollectionRef, where('type', '==', 'income')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(data);
        }, (error) => {
            console.error("Erro ao buscar categorias:", error);
        });

        const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(data);
        }, (error) => {
            console.error("Erro ao buscar usuários:", error);
        });

        return () => {
            unsubscribeIncomes();
            unsubscribeCategories();
            unsubscribeUsers();
        };
    }, [db, userId]);

    const handleDelete = async (id) => {
        if (!db) return;
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const incomeDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'incomes', id);
            await deleteDoc(incomeDocRef);
            setMessage('Entrada excluída com sucesso!');
            setMessageType('success');
        } catch (e) {
            console.error("Erro ao excluir entrada:", e);
            setMessage('Erro ao excluir entrada.');
            setMessageType('error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Erro: Usuário não autenticado ou banco de dados não disponível.');
            setMessageType('error');
            return;
        }
        if (!description || !amount || !category || !date || !transactionUser) { // Validar o usuário da transação
            setMessage('Por favor, preencha todos os campos.');
            setMessageType('error');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setMessage('Valor inválido. Por favor, insira um número positivo.');
            setMessageType('error');
            return;
        }

        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const incomesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'incomes');

            await addDoc(incomesCollectionRef, {
                userId: userId, // ID do grupo
                description,
                amount: parsedAmount,
                category,
                date: new Date(date),
                type: 'income',
                transactionUser // Usuário que fez a transação
            });
            setMessage('Entrada adicionada com sucesso!');
            setMessageType('success');
            setDescription('');
            setAmount('');
            setCategory('');
            setTransactionUser('');
            setDate(new Date().toISOString().split('T')[0]);
        } catch (e) {
            console.error("Erro ao adicionar entrada:", e);
            setMessage('Erro ao adicionar entrada. Por favor, tente novamente.');
            setMessageType('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Entradas</h2>

            <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="income-description" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Descrição</label>
                        <input
                            type="text"
                            id="income-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            placeholder="Salário, Venda, etc."
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="income-amount" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Valor (R$)</label>
                        <input
                            type="number"
                            id="income-amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            placeholder="Ex: 1500.00"
                            step="0.01"
                            required
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="income-category" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Categoria</label>
                        <select
                            id="income-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            required
                        >
                            <option value="">Selecione uma categoria</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="income-user" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Usuário</label>
                        <select
                            id="income-user"
                            value={transactionUser}
                            onChange={(e) => setTransactionUser(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            required
                        >
                            <option value="">Selecione um usuário</option>
                            {users.map(user => (
                                <option key={user.id} value={user.name}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="income-date" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data</label>
                    <input
                        type="date"
                        id="income-date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    Adicionar Entrada
                </button>
                {message && (
                    <div className={`mt-3 p-3 rounded-md text-sm ${messageType === 'success' ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')}`}>
                        {message}
                    </div>
                )}
            </form>

            <h3 className={`text-xl font-bold border-b pb-2 mb-4 mt-8 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Histórico de Entradas</h3>
            {incomes.length === 0 ? (
                <p className={`text-center py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhuma entrada registrada ainda.</p>
            ) : (
                <div className={`overflow-x-auto rounded-lg shadow-md ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Data</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Descrição</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Categoria</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Usuário</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Valor (R$)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'}`}>{
                            incomes.map((income) => (
                                <tr key={income.id} className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                        {income.date instanceof Timestamp
                                            ? income.date.toDate().toLocaleDateString('pt-BR')
                                            : new Date(income.date).toLocaleDateString('pt-BR')
                                        }
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{income.description}</td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{income.category}</td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{income.transactionUser}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-green-500 font-semibold">R$ {income.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <button
                                            onClick={() => handleDelete(income.id)}
                                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))
                        }</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Componente para a seção de Saídas
const ExpensesSection = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [transactionUser, setTransactionUser] = useState(''); // Novo estado para o usuário da transação
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]); // Novo estado para usuários
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        const expensesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
        const categoriesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
        const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users'); // Referência à coleção de usuários

        const unsubscribeExpenses = onSnapshot(query(expensesCollectionRef, orderBy('date', 'desc')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(data);
        }, (error) => {
            console.error("Erro ao buscar saídas:", error);
            setMessage('Erro ao carregar saídas.');
            setMessageType('error');
        });

        const unsubscribeCategories = onSnapshot(query(categoriesCollectionRef, where('type', '==', 'expense')), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(data);
        }, (error) => {
            console.error("Erro ao buscar categorias:", error);
        });

        const unsubscribeUsers = onSnapshot(usersCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(data);
        }, (error) => {
            console.error("Erro ao buscar usuários:", error);
        });

        return () => {
            unsubscribeExpenses();
            unsubscribeCategories();
            unsubscribeUsers();
        };
    }, [db, userId]);

    const handleDelete = async (id) => {
        if (!db) return;
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const expenseDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'expenses', id);
            await deleteDoc(expenseDocRef);
            setMessage('Saída excluída com sucesso!');
            setMessageType('success');
        } catch (e) {
            console.error("Erro ao excluir saída:", e);
            setMessage('Erro ao excluir saída.');
            setMessageType('error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Erro: Usuário não autenticado ou banco de dados não disponível.');
            setMessageType('error');
            return;
        }
        if (!description || !amount || !category || !date || !transactionUser) { // Validar o usuário da transação
            setMessage('Por favor, preencha todos os campos.');
            setMessageType('error');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            setMessage('Valor inválido. Por favor, insira um número positivo.');
            setMessageType('error');
            return;
        }

        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const expensesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');

            await addDoc(expensesCollectionRef, {
                userId: userId, // ID do grupo
                description,
                amount: parsedAmount,
                category,
                date: new Date(date),
                type: 'expense',
                transactionUser // Usuário que fez a transação
            });
            setMessage('Saída adicionada com sucesso!');
            setMessageType('success');
            setDescription('');
            setAmount('');
            setCategory('');
            setTransactionUser('');
            setDate(new Date().toISOString().split('T')[0]);
        } catch (e) {
            console.error("Erro ao adicionar saída:", e);
            setMessage('Erro ao adicionar saída. Por favor, tente novamente.');
            setMessageType('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Saídas</h2>

            <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="expense-description" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Descrição</label>
                        <input
                            type="text"
                            id="expense-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            placeholder="Aluguel, Comida, Lazer, etc."
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="expense-amount" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Valor (R$)</label>
                        <input
                            type="number"
                            id="expense-amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            placeholder="Ex: 50.00"
                            step="0.01"
                            required
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="expense-category" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Categoria</label>
                        <select
                            id="expense-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            required
                        >
                            <option value="">Selecione uma categoria</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="expense-user" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Usuário</label>
                        <select
                            id="expense-user"
                            value={transactionUser}
                            onChange={(e) => setTransactionUser(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            required
                        >
                            <option value="">Selecione um usuário</option>
                            {users.map(user => (
                                <option key={user.id} value={user.name}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label htmlFor="expense-date" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data</label>
                    <input
                        type="date"
                        id="expense-date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    Adicionar Saída
                </button>
                {message && (
                    <div className={`mt-3 p-3 rounded-md text-sm ${messageType === 'success' ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')}`}>
                        {message}
                    </div>
                )}
            </form>

            <h3 className={`text-xl font-bold border-b pb-2 mb-4 mt-8 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Histórico de Saídas</h3>
            {expenses.length === 0 ? (
                <p className={`text-center py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhuma saída registrada ainda.</p>
            ) : (
                <div className={`overflow-x-auto rounded-lg shadow-md ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Data</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Descrição</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Categoria</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Usuário</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Valor (R$)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'}`}>{
                            expenses.map((expense) => (
                                <tr key={expense.id} className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                        {expense.date instanceof Timestamp
                                            ? expense.date.toDate().toLocaleDateString('pt-BR')
                                            : new Date(expense.date).toLocaleDateString('pt-BR')
                                        }
                                    </td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{expense.description}</td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{expense.category}</td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{expense.transactionUser}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-500 font-semibold">R$ {expense.amount.toFixed(2)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <button
                                            onClick={() => handleDelete(expense.id)}
                                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                                        >
                                            Excluir
                                        </button>
                                    </td>
                                </tr>
                            ))
                        }</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Componente para a seção de Categorias
const CategoriesSection = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [name, setName] = useState('');
    const [type, setType] = useState('income');
    const [categories, setCategories] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const categoriesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');

        const unsubscribe = onSnapshot(categoriesCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(data);
        }, (error) => {
            console.error("Erro ao buscar categorias:", error);
            setMessage('Erro ao carregar categorias.');
            setMessageType('error');
        });

        return () => unsubscribe();
    }, [db, userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Erro: Usuário não autenticado ou banco de dados não disponível.');
            setMessageType('error');
            return;
        }
        if (!name) {
            setMessage('Por favor, insira o nome da categoria.');
            setMessageType('error');
            return;
        }

        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const categoriesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');

            await addDoc(categoriesCollectionRef, {
                userId: userId,
                name,
                type
            });
            setMessage('Categoria adicionada com sucesso!');
            setMessageType('success');
            setName('');
        } catch (e) {
            console.error("Erro ao adicionar categoria:", e);
            setMessage('Erro ao adicionar categoria. Por favor, tente novamente.');
            setMessageType('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Categorias</h2>

            <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div>
                    <label htmlFor="category-name" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Nome da Categoria</label>
                    <input
                        type="text"
                        id="category-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                        placeholder="Ex: Salário, Aluguel, Lazer"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="category-type" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Tipo</label>
                    <select
                        id="category-type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                    >
                        <option value="income">Entrada</option>
                        <option value="expense">Saída</option>
                    </select>
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    Adicionar Categoria
                </button>
                {message && (
                    <div className={`mt-3 p-3 rounded-md text-sm ${messageType === 'success' ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')}`}>
                        {message}
                    </div>
                )}
            </form>

            <h3 className={`text-xl font-bold border-b pb-2 mb-4 mt-8 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Categorias Existentes</h3>
            {categories.length === 0 ? (
                <p className={`text-center py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhuma categoria registrada ainda.</p>
            ) : (
                <div className={`overflow-x-auto rounded-lg shadow-md ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Nome</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'}`}>{
                            categories.map((cat) => (
                                <tr key={cat.id} className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{cat.name}</td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'} capitalize`}>{cat.type === 'income' ? 'Entrada' : 'Saída'}</td>
                                </tr>
                            ))
                        }</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Componente para a seção de Metas
const GoalsSection = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [currentAmount, setCurrentAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [goals, setGoals] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const goalsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'goals');

        const unsubscribe = onSnapshot(goalsCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGoals(data);
        }, (error) => {
            console.error("Erro ao buscar metas:", error);
            setMessage('Erro ao carregar metas.');
            setMessageType('error');
        });

        return () => unsubscribe();
    }, [db, userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Erro: Usuário não autenticado ou banco de dados não disponível.');
            setMessageType('error');
            return;
        }
        if (!name || !targetAmount || !currentAmount || !dueDate) {
            setMessage('Por favor, preencha todos os campos.');
            setMessageType('error');
            return;
        }

        const parsedTargetAmount = parseFloat(targetAmount);
        const parsedCurrentAmount = parseFloat(currentAmount);

        if (isNaN(parsedTargetAmount) || parsedTargetAmount <= 0 || isNaN(parsedCurrentAmount) || parsedCurrentAmount < 0) {
            setMessage('Valores inválidos. Por favor, insira números positivos para o valor da meta e não negativos para o valor atual.');
            setMessageType('error');
            return;
        }

        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const goalsCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'goals');

            await addDoc(goalsCollectionRef, {
                userId: userId,
                name,
                targetAmount: parsedTargetAmount,
                currentAmount: parsedCurrentAmount,
                dueDate: new Date(dueDate),
            });
            setMessage('Meta adicionada com sucesso!');
            setMessageType('success');
            setName('');
            setTargetAmount('');
            setCurrentAmount('');
            setDueDate('');
        } catch (e) {
            console.error("Erro ao adicionar meta:", e);
            setMessage('Erro ao adicionar meta. Por favor, tente novamente.');
            setMessageType('error');
        }
    };

    const handleDelete = async (id) => {
        if (!db) return;
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const goalDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'goals', id);
            await deleteDoc(goalDocRef);
            setMessage('Meta excluída com sucesso!');
            setMessageType('success');
        } catch (e) {
            console.error("Erro ao excluir meta:", e);
            setMessage('Erro ao excluir meta.');
            setMessageType('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Metas Financeiras</h2>

            <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="goal-name" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Nome da Meta</label>
                        <input
                            type="text"
                            id="goal-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            placeholder="Ex: Carro Novo, Viagem"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="goal-target-amount" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Valor da Meta (R$)</label>
                        <input
                            type="number"
                            id="goal-target-amount"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            placeholder="Ex: 20000.00"
                            step="0.01"
                            required
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="goal-current-amount" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Valor Atual (R$)</label>
                        <input
                            type="number"
                            id="goal-current-amount"
                            value={currentAmount}
                            onChange={(e) => setCurrentAmount(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            placeholder="Ex: 5000.00"
                            step="0.01"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="goal-due-date" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data Limite</label>
                        <input
                            type="date"
                            id="goal-due-date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                            required
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    Adicionar Meta
                </button>
                {message && (
                    <div className={`mt-3 p-3 rounded-md text-sm ${messageType === 'success' ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')}`}>
                        {message}
                    </div>
                )}
            </form>

            <h3 className={`text-xl font-bold border-b pb-2 mb-4 mt-8 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Metas Existentes</h3>
            {goals.length === 0 ? (
                <p className={`text-center py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhuma meta registrada ainda.</p>
            ) : (
                <div className={`overflow-x-auto rounded-lg shadow-md ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Nome</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Meta (R$)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Atual (R$)</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Progresso</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Data Limite</th>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'}`}>{
                            goals.map((goal) => {
                                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                                return (
                                    <tr key={goal.id} className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{goal.name}</td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>R$ {goal.targetAmount.toFixed(2)}</td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>R$ {goal.currentAmount.toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className="bg-blue-600 h-2.5 rounded-full"
                                                    style={{ width: `${Math.min(100, progress).toFixed(0)}%` }}
                                                ></div>
                                            </div>
                                            <span className={`ml-2 text-xs ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{progress.toFixed(0)}%</span>
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                            {goal.dueDate instanceof Timestamp
                                                ? goal.dueDate.toDate().toLocaleDateString('pt-BR')
                                                : new Date(goal.dueDate).toLocaleDateString('pt-BR')
                                            }
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <button
                                                onClick={() => handleDelete(goal.id)}
                                                className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                                            >
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        }</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// Componente para a seção de Saldo Inicial
const InitialBalanceSection = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [amount, setAmount] = useState('');
    const [currentBalance, setCurrentBalance] = useState(0);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const initialBalanceDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'initialBalance');

        const unsubscribe = onSnapshot(initialBalanceDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setCurrentBalance(docSnap.data().amount || 0);
            } else {
                setCurrentBalance(0);
            }
        }, (error) => {
            console.error("Erro ao buscar saldo inicial:", error);
            setMessage('Erro ao carregar saldo inicial.');
            setMessageType('error');
        });

        return () => unsubscribe();
    }, [db, userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Erro: Usuário não autenticado ou banco de dados não disponível.');
            setMessageType('error');
            return;
        }
        if (!amount) {
            setMessage('Por favor, insira o valor do saldo inicial.');
            setMessageType('error');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount)) {
            setMessage('Valor inválido. Por favor, insira um número.');
            setMessageType('error');
            return;
        }

        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const initialBalanceDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'initialBalance');

            await setDoc(initialBalanceDocRef, { amount: parsedAmount }, { merge: true });
            setMessage('Saldo inicial atualizado com sucesso!');
            setMessageType('success');
            setAmount('');
        } catch (e) {
            console.error("Erro ao atualizar saldo inicial:", e);
            setMessage('Erro ao atualizar saldo inicial. Por favor, tente novamente.');
            setMessageType('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Configurar Saldo Inicial</h2>

            <div className={`p-4 rounded-lg shadow-inner ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
                <p className="text-lg font-semibold">Saldo Inicial Atual: <span className="font-bold">R$ {currentBalance.toFixed(2)}</span></p>
            </div>

            <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div>
                    <label htmlFor="initial-balance-amount" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Novo Saldo Inicial (R$)</label>
                    <input
                        type="number"
                        id="initial-balance-amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                        placeholder="Ex: 1000.00"
                        step="0.01"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    Atualizar Saldo Inicial
                </button>
                {message && (
                    <div className={`mt-3 p-3 rounded-md text-sm ${messageType === 'success' ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')}`}>
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
};

// Componente para a seção de Usuários
const UsersSection = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [name, setName] = useState('');
    const [users, setUsers] = useState([]);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');

        const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(data);
        }, (error) => {
            console.error("Erro ao buscar usuários:", error);
            setMessage('Erro ao carregar usuários.');
            setMessageType('error');
        });

        return () => unsubscribe();
    }, [db, userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Erro: Usuário não autenticado ou banco de dados não disponível.');
            setMessageType('error');
            return;
        }
        if (!name) {
            setMessage('Por favor, insira o nome do usuário.');
            setMessageType('error');
            return;
        }

        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const usersCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');

            await addDoc(usersCollectionRef, {
                userId: userId, // ID do grupo
                name
            });
            setMessage('Usuário adicionado com sucesso!');
            setMessageType('success');
            setName('');
        } catch (e) {
            console.error("Erro ao adicionar usuário:", e);
            setMessage('Erro ao adicionar usuário. Por favor, tente novamente.');
            setMessageType('error');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Gerenciar Usuários</h2>

            <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div>
                    <label htmlFor="user-name" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Nome do Usuário</label>
                    <input
                        type="text"
                        id="user-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                        placeholder="Ex: João, Maria"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                >
                    Adicionar Usuário
                </button>
                {message && (
                    <div className={`mt-3 p-3 rounded-md text-sm ${messageType === 'success' ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')}`}>
                        {message}
                    </div>
                )}
            </form>

            <h3 className={`text-xl font-bold border-b pb-2 mb-4 mt-8 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Usuários Existentes</h3>
            {users.length === 0 ? (
                <p className={`text-center py-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhum usuário registrado ainda.</p>
            ) : (
                <div className={`overflow-x-auto rounded-lg shadow-md ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className={`${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'}`}>
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Nome</th>
                            </tr>
                        </thead>
                        <tbody className={`${darkMode ? 'bg-gray-900 divide-gray-700' : 'bg-white divide-gray-200'}`}>{
                            users.map((user) => (
                                <tr key={user.id} className={`${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{user.name}</td>
                                </tr>
                            ))
                        }</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// Componente para a seção de Resumo
const SummarySection = () => {
    const { db, userId, darkMode } = useContext(FirebaseContext);
    const [incomes, setIncomes] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [initialBalance, setInitialBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [importMessage, setImportMessage] = useState('');
    const [importMessageType, setImportMessageType] = useState('');

    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        
        const incomesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'incomes');
        const expensesCollectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'expenses');
        const initialBalanceDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'initialBalance');

        let initialDataLoaded = 0;
        const totalListeners = 3;
        const checkAllLoaded = () => {
            initialDataLoaded++;
            if (initialDataLoaded >= totalListeners) {
                setLoading(false);
            }
        };

        const unsubscribeIncomes = onSnapshot(incomesCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIncomes(data);
            checkAllLoaded();
        }, (error) => {
            console.error("Erro ao buscar entradas para resumo:", error);
            checkAllLoaded();
        });

        const unsubscribeExpenses = onSnapshot(expensesCollectionRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(data);
            checkAllLoaded();
        }, (error) => {
            console.error("Erro ao buscar saídas para resumo:", error);
            checkAllLoaded();
        });

        const unsubscribeInitialBalance = onSnapshot(initialBalanceDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setInitialBalance(docSnap.data().amount || 0);
            } else {
                setInitialBalance(0);
            }
            checkAllLoaded();
        }, (error) => {
            console.error("Erro ao buscar saldo inicial para resumo:", error);
            checkAllLoaded();
        });

        return () => {
            unsubscribeIncomes();
            unsubscribeExpenses();
            unsubscribeInitialBalance();
        };
    }, [db, userId]);

    // Set default dates to cover the current year if not already set
    useEffect(() => {
        if (!startDate && !endDate) {
            const today = new Date();
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            setStartDate(firstDayOfYear.toISOString().split('T')[0]);
            setEndDate(today.toISOString().split('T')[0]);
        }
    }, [startDate, endDate]);


    const calculateSummary = () => {
        const filteredIncomes = incomes.filter(income => {
            const incomeDate = income.date instanceof Timestamp ? income.date.toDate() : new Date(income.date);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-01-01');
            return incomeDate >= start && incomeDate <= end;
        });

        const filteredExpenses = expenses.filter(expense => {
            const expenseDate = expense.date instanceof Timestamp ? expense.date.toDate() : new Date(expense.date);
            const start = startDate ? new Date(startDate) : new Date('1900-01-01');
            const end = endDate ? new Date(endDate) : new Date('2100-01-01');
            return expenseDate >= start && expenseDate <= end;
        });

        const totalIncomes = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
        const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const currentBalance = initialBalance + totalIncomes - totalExpenses;

        const incomeByCategory = filteredIncomes.reduce((acc, income) => {
            acc[income.category] = (acc[income.category] || 0) + income.amount;
            return acc;
        }, {});

        const expenseByCategory = filteredExpenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        const incomeByUser = filteredIncomes.reduce((acc, income) => {
            acc[income.transactionUser] = (acc[income.transactionUser] || 0) + income.amount;
            return acc;
        }, {});

        const expenseByUser = filteredExpenses.reduce((acc, expense) => {
            acc[expense.transactionUser] = (acc[expense.transactionUser] || 0) + expense.amount;
            return acc;
        }, {});

        // Prepare data for charts
        const incomeByCategoryChartData = Object.entries(incomeByCategory).map(([category, amount]) => ({
            name: category,
            Entradas: amount,
        }));

        const expenseByCategoryChartData = Object.entries(expenseByCategory).map(([category, amount]) => ({
            name: category,
            Saídas: amount,
        }));

        // Combine user incomes and expenses for a single user chart
        const allUsers = [...new Set([...Object.keys(incomeByUser), ...Object.keys(expenseByUser)])];
        const userChartData = allUsers.map(user => ({
            name: user,
            Entradas: incomeByUser[user] || 0,
            Saídas: expenseByUser[user] || 0,
        }));

        return {
            totalIncomes,
            totalExpenses,
            currentBalance,
            incomeByCategory,
            expenseByCategory,
            incomeByUser,
            expenseByUser,
            incomeByCategoryChartData,
            expenseByCategoryChartData,
            userChartData,
        };
    };

    const { totalIncomes, totalExpenses, currentBalance, incomeByCategory, expenseByCategory, incomeByUser, expenseByUser, incomeByCategoryChartData, expenseByCategoryChartData, userChartData } = calculateSummary();

    // Helper function to convert data to CSV string
    const convertToCsv = (data, headers) => {
        const csvRows = [];
        csvRows.push(headers.join(',')); // Add headers

        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + (row[header] || '')).replace(/"/g, '""'); // Handle null/undefined and escape double quotes
                return `"${escaped}"`; // Quote all fields
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    };

    // Helper function to trigger CSV download
    const downloadCsv = (csvString, filename) => {
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportCsv = () => {
        const headers = ['Tipo', 'Data', 'Descrição', 'Valor', 'Categoria', 'Usuário'];
        
        const dataToExport = [];

        // Add Initial Balance
        dataToExport.push({
            'Tipo': 'Saldo Inicial',
            'Data': new Date().toISOString().split('T')[0],
            'Descrição': 'Saldo Inicial do Período',
            'Valor': initialBalance,
            'Categoria': '',
            'Usuário': ''
        });

        // Add Incomes
        incomes.forEach(income => {
            dataToExport.push({
                'Tipo': 'Entrada',
                'Data': income.date instanceof Timestamp ? income.date.toDate().toISOString().split('T')[0] : new Date(income.date).toISOString().split('T')[0],
                'Descrição': income.description,
                'Valor': income.amount,
                'Categoria': income.category,
                'Usuário': income.transactionUser
            });
        });

        // Add Expenses
        expenses.forEach(expense => {
            dataToExport.push({
                'Tipo': 'Saída',
                'Data': expense.date instanceof Timestamp ? expense.date.toDate().toISOString().split('T')[0] : new Date(expense.date).toISOString().split('T')[0],
                'Descrição': expense.description,
                'Valor': expense.amount,
                'Categoria': expense.category,
                'Usuário': expense.transactionUser
            });
        });

        const csvString = convertToCsv(dataToExport, headers);
        downloadCsv(csvString, 'dados_financeiros.csv');
    };

    // Function to parse CSV string into an array of objects
    const parseCsv = (csvString) => {
        const lines = csvString.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i];
            const values = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g).map(val => val.replace(/"/g, '').trim());

            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }
        return data;
    };

    // Handle CSV import
    const handleImportCsv = async (event) => {
        const file = event.target.files[0];
        if (!file) {
            setImportMessage('Nenhum arquivo selecionado.');
            setImportMessageType('error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const parsedData = parseCsv(text);

                if (parsedData.length === 0) {
                    setImportMessage('O arquivo CSV está vazio ou não pôde ser lido.');
                    setImportMessageType('error');
                    return;
                }

                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                const batch = writeBatch(db);

                let importedCount = 0;

                for (const row of parsedData) {
                    const amount = parseFloat(row['Valor']?.replace(',', '.'));
                    if (isNaN(amount)) {
                        console.warn(`Pulando linha devido a valor inválido: ${JSON.stringify(row)}`);
                        continue;
                    }

                    const type = row['Tipo'];
                    if (type === 'Saldo Inicial') {
                        const initialBalanceDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'initialBalance');
                        batch.set(initialBalanceDocRef, { amount: amount }, { merge: true });
                        importedCount++;
                    } else if (type === 'Entrada' || type === 'Saída') {
                        const collectionName = type === 'Entrada' ? 'incomes' : 'expenses';
                        const newDocRef = doc(collection(db, 'artifacts', appId, 'public', 'data', collectionName));
                        batch.set(newDocRef, {
                            userId: userId,
                            description: row['Descrição'] || '',
                            amount: amount,
                            category: row['Categoria'] || '',
                            date: new Date(row['Data']),
                            type: type === 'Entrada' ? 'income' : 'expense',
                            transactionUser: row['Usuário'] || 'Desconhecido',
                        });
                        importedCount++;
                    }
                }
                
                await batch.commit();

                setImportMessage(`${importedCount} registros importados com sucesso!`);
                setImportMessageType('success');
            } catch (error) {
                console.error("Erro ao processar arquivo CSV:", error);
                setImportMessage('Erro ao processar o arquivo CSV. Verifique o formato e os dados.');
                setImportMessageType('error');
            }
        };
        reader.readAsText(file);
        event.target.value = null; // Reset file input
    };


    if (loading) {
        return <div className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Carregando resumo...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className={`text-2xl font-bold border-b pb-2 mb-4 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Resumo Financeiro</h2>

            {/* Date Range Filter and Import/Export */}
            <div className={`p-6 rounded-lg shadow-md space-y-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Filtrar por Período</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDate" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data de Início</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Data de Fim</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                        />
                    </div>
                </div>
                
                <div className="mt-6 border-t pt-4 border-gray-200 dark:border-gray-600">
                     <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Importar e Exportar Dados</h3>
                    <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Exporte todos os seus dados (saldo inicial, entradas e saídas) para um único arquivo CSV, ou importe de um arquivo para restaurar seus dados.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                             <button
                                onClick={handleExportCsv}
                                className="w-full bg-green-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                            >
                                Exportar Tudo (CSV)
                            </button>
                        </div>
                        <div>
                            <label htmlFor="import-csv" className="w-full text-center bg-purple-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200 cursor-pointer">
                                Importar Tudo (CSV)
                            </label>
                            <input
                                type="file"
                                id="import-csv"
                                accept=".csv"
                                onChange={handleImportCsv}
                                className="hidden"
                            />
                        </div>
                    </div>
                     {importMessage && (
                        <div className={`mt-3 p-3 rounded-md text-sm ${messageType === 'success' ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700')}`}>
                            {importMessage}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg shadow-md text-center ${darkMode ? 'bg-green-900 text-green-200' : 'bg-green-50 text-green-800'}`}>
                    <p className="text-lg font-semibold">Total de Entradas</p>
                    <p className="text-2xl font-bold">R$ {totalIncomes.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded-lg shadow-md text-center ${darkMode ? 'bg-red-900 text-red-200' : 'bg-red-50 text-red-800'}`}>
                    <p className="text-lg font-semibold">Total de Saídas</p>
                    <p className="text-2xl font-bold">R$ {totalExpenses.toFixed(2)}</p>
                </div>
                <div className={`p-4 rounded-lg shadow-md text-center ${currentBalance >= 0 ? (darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-800') : (darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-50 text-orange-800')}`}>
                    <p className="text-lg font-semibold">Saldo Atual</p>
                    <p className={`text-2xl font-bold ${currentBalance >= 0 ? (darkMode ? 'text-blue-200' : 'text-blue-900') : (darkMode ? 'text-orange-200' : 'text-orange-900')}`}>R$ {currentBalance.toFixed(2)}</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                    <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Entradas e Saídas por Usuário</h3>
                    {userChartData.length === 0 ? (
                        <p className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhum dado para exibir.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={userChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4A5568' : '#E2E8F0'} />
                                <XAxis dataKey="name" stroke={darkMode ? '#CBD5E0' : '#4A5568'} />
                                <YAxis stroke={darkMode ? '#CBD5E0' : '#4A5568'} />
                                <Tooltip
                                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: darkMode ? '#2D3748' : '#FFFFFF',
                                        borderColor: darkMode ? '#4A5568' : '#E2E8F0',
                                        color: darkMode ? '#CBD5E0' : '#4A5568'
                                    }}
                                    itemStyle={{ color: darkMode ? '#CBD5E0' : '#4A5568' }}
                                />
                                <Legend />
                                <Bar dataKey="Entradas" fill="#4CAF50" />
                                <Bar dataKey="Saídas" fill="#F44336" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                    <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Entradas por Categoria</h3>
                    {incomeByCategoryChartData.length === 0 ? (
                        <p className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhum dado para exibir.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={incomeByCategoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4A5568' : '#E2E8F0'} />
                                <XAxis dataKey="name" stroke={darkMode ? '#CBD5E0' : '#4A5568'} />
                                <YAxis stroke={darkMode ? '#CBD5E0' : '#4A5568'} />
                                <Tooltip
                                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: darkMode ? '#2D3748' : '#FFFFFF',
                                        borderColor: darkMode ? '#4A5568' : '#E2E8F0',
                                        color: darkMode ? '#CBD5E0' : '#4A5568'
                                    }}
                                    itemStyle={{ color: darkMode ? '#CBD5E0' : '#4A5568' }}
                                />
                                <Legend />
                                <Bar dataKey="Entradas" fill="#4CAF50" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-white'}`}>
                    <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Saídas por Categoria</h3>
                    {expenseByCategoryChartData.length === 0 ? (
                        <p className={`text-center py-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Nenhum dado para exibir.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={expenseByCategoryChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#4A5568' : '#E2E8F0'} />
                                <XAxis dataKey="name" stroke={darkMode ? '#CBD5E0' : '#4A5568'} />
                                <YAxis stroke={darkMode ? '#CBD5E0' : '#4A5568'} />
                                <Tooltip
                                    formatter={(value) => `R$ ${value.toFixed(2)}`}
                                    contentStyle={{
                                        backgroundColor: darkMode ? '#2D3748' : '#FFFFFF',
                                        borderColor: darkMode ? '#4A5568' : '#E2E8F0',
                                        color: darkMode ? '#CBD5E0' : '#4A5568'
                                    }}
                                    itemStyle={{ color: darkMode ? '#CBD5E0' : '#4A5568' }}
                                />
                                <Legend />
                                <Bar dataKey="Saídas" fill="#F44336" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Entradas por Categoria</h3>
                    {Object.keys(incomeByCategory).length === 0 ? (
                        <p className={`text-gray-600 ${darkMode ? 'text-gray-300' : ''}`}>Nenhuma entrada por categoria.</p>
                    ) : (
                        <ul className="space-y-2">
                            {Object.entries(incomeByCategory).map(([category, amount]) => (
                                <li key={category} className={`flex justify-between items-center ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <span>{category}</span>
                                    <span className="font-semibold text-green-500">R$ {amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Saídas por Categoria</h3>
                    {Object.keys(expenseByCategory).length === 0 ? (
                        <p className={`text-gray-600 ${darkMode ? 'text-gray-300' : ''}`}>Nenhuma saída por categoria.</p>
                    ) : (
                        <ul className="space-y-2">
                            {Object.entries(expenseByCategory).map(([category, amount]) => (
                                <li key={category} className={`flex justify-between items-center ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <span>{category}</span>
                                    <span className="font-semibold text-red-500">R$ {amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Entradas por Usuário</h3>
                    {Object.keys(incomeByUser).length === 0 ? (
                        <p className={`text-gray-600 ${darkMode ? 'text-gray-300' : ''}`}>Nenhuma entrada por usuário.</p>
                    ) : (
                        <ul className="space-y-2">
                            {Object.entries(incomeByUser).map(([user, amount]) => (
                                <li key={user} className={`flex justify-between items-center ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <span>{user}</span>
                                    <span className="font-semibold text-green-500">R$ {amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={`p-6 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <h3 className={`text-xl font-bold mb-4 border-b pb-2 ${darkMode ? 'text-gray-100 border-gray-600' : 'text-gray-800 border-gray-200'}`}>Saídas por Usuário</h3>
                    {Object.keys(expenseByUser).length === 0 ? (
                        <p className={`text-gray-600 ${darkMode ? 'text-gray-300' : ''}`}>Nenhuma saída por usuário.</p>
                    ) : (
                        <ul className="space-y-2">
                            {Object.entries(expenseByUser).map(([user, amount]) => (
                                <li key={user} className={`flex justify-between items-center ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                    <span>{user}</span>
                                    <span className="font-semibold text-red-500">R$ {amount.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
