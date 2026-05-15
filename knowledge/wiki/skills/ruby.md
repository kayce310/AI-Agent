# Ruby Language Skill

> **Nguồn:** [lucianghinda/superpowers-ruby](lucianghinda/superpowers-ruby/ruby)
> **Commit:** `cb03f92`
> **Generated:** 2026-05-03

> **Review:** ✅ approved

---



### Overview

Opinionated Ruby conventions and idioms for writing idiomatic Ruby 3.x+ code. Focuses on patterns agents miss by default — the Weirich raise/fail distinction, safe nil-aware memoization, result objects over exceptions for expected failures, and performance-conscious enumeration.

### Error Handling Conventions

#### Weirich raise/fail Convention

Use `fail` for first-time exceptions, `raise` only for re-raising:

```ruby
def process(order)
  fail ArgumentError, "Order cannot be nil" if order.nil?

  begin
    gateway.charge(order)
  rescue PaymentError => e
    logger.error("Payment failed: #{e.message}")
    raise  # re-raise with raise
  end
end
```

#### Custom Exception Hierarchies

Group domain exceptions under a base error:

```ruby
module MyApp
  class Error < StandardError; end
  class PaymentError < Error; end
  class InsufficientFundsError < PaymentError; end
end

rescue MyApp::InsufficientFundsError  # specific
rescue MyApp::PaymentError            # category
rescue MyApp::Error                   # all app errors
```

#### Result Objects for Expected Failures

Use result objects instead of exceptions for expected failure paths:

```ruby
class Result
  attr_reader :value, :error
  def self.success(value) = new(value: value)
  def self.failure(error) = new(error: error)
  def initialize(value: nil, error: nil) = (@value, @error = value, error)
  def success? = error.nil?
  def failure? = !success?
end
```

#### Caller-Supplied Fallback

Let callers define error handling via blocks:

```ruby
def fetch_user(id, &fallback)
  User.find(id)
rescue ActiveRecord::RecordNotFound => e
  fallback ? fallback.call(e) : raise
end

user = fetch_user(999) { |_| User.new(name: "Guest") }
```

See `references/error_handling.md` for full patterns and retry strategies.

### Modern Ruby (3.x+)

#### Pattern Matching

```ruby
case response
in { status: 200, body: { users: [{ name: }, *] } }
  "First user: #{name}"
in { status: (400..), error: message }
  "Error: #{message}"
end

case array
in [*, String => str, *]
  "Found string: #{str}"
end

expected = 200
case response
in { status: ^expected, body: }
  process(body)
end
```

#### Other 3.x+ Features

```ruby
def square(x) = x * x
def admin? = role == "admin"

[1, 2, 3].map { _1 * 2 }

Point = Data.define(:x, :y)
p = Point.new(x: 1, y: 2)
p.with(x: 3)  # => Point(x: 3, y: 2)

params.except(:password, :admin)

users.filter_map { |u| u.email if u.active? }

%w[a b a c b a].tally  # => {"a"=>3, "b"=>2, "c"=>1}
```

See `references/modern_ruby.md` for ractors, fiber scheduler, RBS types, and advanced pattern matching.

### Performance Quick Wins

#### Frozen String Literals

```ruby
```

#### Efficient Enumeration

```ruby
totals = items.each_with_object(Hash.new(0)) do |item, hash|
  hash[item.category] += item.amount
end

(1..Float::INFINITY).lazy.select(&:odd?).map { _1 ** 2 }.first(10)
```

#### Memoization with nil/false Caveat

```ruby
def users = @users ||= User.all.to_a

def feature_enabled?
  return @feature_enabled if defined?(@feature_enabled)
  @feature_enabled = expensive_check
end
```

#### String Building

```ruby
result = ""; items.each { |i| result += i.to_s }

result = String.new; items.each { |i| result << i.to_s }

items.map(&:to_s).join
```

See `references/performance.md` for YJIT, GC tuning, benchmarking, and profiling tools.

### Ruby Idioms to Prefer

#### Guard Clauses

```ruby
def process(value)
  return unless value
  return unless value.valid?
  # main logic here
end
```

#### Literal Array Constructors

```ruby
STATES = %w[draft published archived]      # word array
FIELDS = %i[name email created_at]         # symbol array
```

#### Hash#fetch for Required Keys

```ruby
config.fetch(:api_key)                     # raises KeyError if missing
config.fetch(:timeout, 30)                 # default value
config.fetch(:handler) { build_handler }   # lazy default
```

#### Safe Navigation

```ruby
user&.profile&.avatar_url  # returns nil if any link is nil
```

#### Predicate and Bang Conventions

- `?` suffix: returns boolean (`empty?`, `valid?`, `admin?`)
- `!` suffix: dangerous version - mutates receiver or raises on failure (`save!`, `sort!`)
- Always provide a non-bang alternative when defining bang methods

### Common Mistakes

| Mistake | Fix |
|---------|-----|
| `raise` for new exceptions | Use `fail`; reserve `raise` for re-raising (Weirich convention) |
| `@var \|\|= compute` when result can be `nil`/`false` | Use `defined?(@var)` check instead |
| String concatenation with `+=` in loops | Use `<<` or `.join` — `+=` is O(n²) |
| `rescue Exception` | Rescue `StandardError` — `Exception` catches `SignalException`, `NoMemoryError` |
| Deep `&.` chains (3+ links) | Extract to a method or use explicit nil check |
| Missing `# frozen_string_literal: true` | Add to top of every file |

### References

- `references/modern_ruby.md` - Pattern matching, ractors, fiber scheduler, RBS types
- `references/error_handling.md` - Exception hierarchies, result objects, retry patterns
- `references/performance.md` - YJIT, GC tuning, benchmarking, profiling
- `references/ood-philosophy.md` - OOD principles, naming, SOLID, TRUE heuristic, Law of Demeter


---

*Converted from autoskills — source: lucianghinda/superpowers-ruby/ruby @ cb03f92*