# Pandas Data Analysis

> **Nguồn:** [pluginagentmarketplace/custom-plugin-python](pluginagentmarketplace/custom-plugin-python/pandas-data-analysis)
> **Commit:** `4415517`
> **Generated:** 2026-05-03

> **Review:** ✅ approved

---



### Overview

Master data analysis with Pandas, the powerful Python library for data manipulation and analysis. Learn to clean, transform, analyze, and visualize data effectively.

### Learning Objectives

- Load and manipulate data from various sources (CSV, Excel, SQL, APIs)
- Clean and transform messy datasets
- Perform exploratory data analysis (EDA)
- Aggregate and group data for insights
- Create compelling visualizations
- Optimize performance for large datasets

### Core Topics

#### 1. Pandas DataFrames & Series
- Creating DataFrames from various sources
- Indexing and selecting data (loc, iloc, at, iat)
- Filtering and boolean indexing
- Adding/removing columns and rows
- Data types and conversions

**Code Example:**
```python
import pandas as pd
import numpy as np

data = {
    'name': ['Alice', 'Bob', 'Charlie', 'David'],
    'age': [25, 30, 35, 28],
    'salary': [50000, 60000, 75000, 55000],
    'department': ['IT', 'HR', 'IT', 'Sales']
}
df = pd.DataFrame(data)

it_employees = df[df['department'] == 'IT']
high_earners = df.loc[df['salary'] > 55000, ['name', 'salary']]

df['annual_bonus'] = df['salary'] * 0.10
df['age_group'] = pd.cut(df['age'], bins=[0, 30, 40, 100], labels=['Young', 'Mid', 'Senior'])

print(df)
```

#### 2. Data Cleaning & Transformation
- Handling missing data (dropna, fillna, interpolate)
- Removing duplicates
- String operations and text cleaning
- Date/time parsing and manipulation
- Type conversions and casting
- Applying custom functions (apply, map, applymap)

**Code Example:**
```python
import pandas as pd

df = pd.read_csv('sales_data.csv')

df['price'].fillna(df['price'].median(), inplace=True)
df['category'].fillna('Unknown', inplace=True)
df.dropna(subset=['customer_id'], inplace=True)

df['product_name'] = df['product_name'].str.strip().str.lower()
df['product_name'] = df['product_name'].str.replace('[^a-zA-Z0-9 ]', '', regex=True)

df['order_date'] = pd.to_datetime(df['order_date'])
df['year'] = df['order_date'].dt.year
df['month'] = df['order_date'].dt.month

df.drop_duplicates(subset=['order_id'], keep='first', inplace=True)

def categorize_price(price):
    if price < 50:
        return 'Low'
    elif price < 100:
        return 'Medium'
    else:
        return 'High'

df['price_category'] = df['price'].apply(categorize_price)
```

#### 3. Aggregation & Grouping
- GroupBy operations
- Aggregation functions (sum, mean, count, etc.)
- Pivot tables and cross-tabulation
- Multi-level indexing
- Window functions (rolling, expanding)

**Code Example:**
```python
import pandas as pd

df = pd.read_csv('sales.csv')

dept_stats = df.groupby('department').agg({
    'salary': ['mean', 'min', 'max'],
    'employee_id': 'count'
})

sales_by_region_product = df.groupby(['region', 'product_category'])['sales'].sum()

pivot = df.pivot_table(
    values='sales',
    index='product_category',
    columns='quarter',
    aggfunc='sum',
    fill_value=0
)

df['sales_ma_7d'] = df.groupby('product_id')['sales'].transform(
    lambda x: x.rolling(window=7, min_periods=1).mean()
)

df['cumulative_sales'] = df.groupby('product_id')['sales'].cumsum()
```

#### 4. Data Visualization
- Matplotlib basics
- Seaborn for statistical plots
- Pandas built-in plotting
- Customizing plots
- Creating dashboards

**Code Example:**
```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

sns.set_style('whitegrid')

df = pd.read_csv('sales_data.csv')

df.groupby('month')['sales'].sum().plot(kind='line', figsize=(10, 6))
plt.title('Monthly Sales Trend')
plt.xlabel('Month')
plt.ylabel('Total Sales ($)')
plt.show()

category_sales = df.groupby('category')['sales'].sum().sort_values(ascending=False)
category_sales.plot(kind='bar', figsize=(10, 6))
plt.title('Sales by Category')
plt.xlabel('Category')
plt.ylabel('Total Sales ($)')
plt.xticks(rotation=45)
plt.show()

df['price'].hist(bins=30, figsize=(10, 6))
plt.title('Price Distribution')
plt.xlabel('Price ($)')
plt.ylabel('Frequency')
plt.show()

df.boxplot(column='salary', by='department', figsize=(10, 6))
plt.title('Salary Distribution by Department')
plt.suptitle('')
plt.show()

corr = df[['age', 'salary', 'years_experience']].corr()
sns.heatmap(corr, annot=True, cmap='coolwarm', center=0)
plt.title('Correlation Matrix')
plt.show()
```

### Hands-On Practice

#### Project 1: Customer Analytics
Analyze customer purchase behavior and segmentation.

**Requirements:**
- Load customer transaction data
- Clean and prepare dataset
- Calculate RFM (Recency, Frequency, Monetary) metrics
- Customer segmentation
- Visualize insights
- Generate executive summary

**Key Skills:** Data cleaning, aggregation, visualization

#### Project 2: Time Series Analysis
Analyze sales trends and forecast future performance.

**Requirements:**
- Load time series data
- Handle missing dates
- Calculate moving averages
- Identify trends and seasonality
- Detect anomalies
- Create interactive visualizations

**Key Skills:** Time series operations, rolling windows, plotting

#### Project 3: Data Quality Report
Build automated data quality assessment tool.

**Requirements:**
- Check for missing values
- Identify duplicates
- Detect outliers
- Validate data types
- Generate quality metrics
- Export HTML report

**Key Skills:** Data validation, statistical analysis, reporting

### Assessment Criteria

- [ ] Load and clean real-world datasets efficiently
- [ ] Perform complex data transformations
- [ ] Use GroupBy for aggregations
- [ ] Create insightful visualizations
- [ ] Handle missing and inconsistent data
- [ ] Optimize performance for large datasets
- [ ] Document analysis with clear explanations

### Resources

#### Official Documentation
- [Pandas Docs](https://pandas.pydata.org/docs/) - Official documentation
- [NumPy Docs](https://numpy.org/doc/) - NumPy documentation
- [Matplotlib Docs](https://matplotlib.org/) - Plotting library

#### Learning Platforms
- [Kaggle](https://www.kaggle.com/learn/pandas) - Free Pandas course
- [DataCamp](https://www.datacamp.com/courses/pandas-foundations) - Interactive courses
- [Python for Data Analysis](https://wesmckinney.com/book/) - Wes McKinney's book

#### Tools
- [Jupyter Notebook](https://jupyter.org/) - Interactive development
- [Google Colab](https://colab.research.google.com/) - Cloud notebooks
- [Anaconda](https://www.anaconda.com/) - Data science distribution

### Next Steps

After mastering Pandas, explore:
- **Scikit-learn** - Machine learning
- **SQL** - Database querying
- **Apache Spark** - Big data processing
- **Tableau/Power BI** - Business intelligence tools


---

*Converted from autoskills — source: pluginagentmarketplace/custom-plugin-python/pandas-data-analysis @ 4415517*