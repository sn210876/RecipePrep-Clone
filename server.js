// OLD (dangerous)
app.use(cors());

// NEW (secure)
app.use(cors({
  origin: ['https://mealscrape.com', 'https://www.mealscrape.com', ...localhosts],
  methods: ['GET','POST','OPTIONS'],
  credentials: true,
}));

// OLD (applied to everything)
app.use(limiter);

// NEW (only on the expensive route)
app.use('/api/extract-recipe-from-video', limiter);
