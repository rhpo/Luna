## NOTE: This README.md file is under construction, please be patient and refer to the code below.


[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![Linkedin][linkedin-shield]][linkedin-url]
[![Discord][discord-shield]][discord-url]

# Luna 🌙 &nbsp;&horbar;&nbsp; A High-Level Programming language.

<div align="center">
<br>
   <img src="/luna.png" width="140">

   <h3 align="center">Luna</h3>

  <p align="center">
    <strong>Luna: </strong> An <strong>elegant</strong>, versatile programming language with efficient scripting capabilities, built in TypeScript for simplicity and productivity in both general programming and automation tasks.
    <br />
    <a href="https://github.com/rhpo/luna/tree/main/docs"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://rhpo.github.io/luna/demo/mario-game/">View Examples</a>
    ·
    <a href="https://github.com/rhpo/luna/issues">Report Bug</a>
    ·
    <a href="mailto:luna@ramey.ml">Request Feature</a>
  </p>

</div>

</center>

<details>
  <summary>Table of Contents</summary>
  <ol>
     <li>
      <a href="#news">📰 News</a>
    </li>
    <li>
      <a href="#about-the-project">🔍 About The Project</a>
    </li>
    <li><a href="#why-choose">🤔 Why Luna?</a></li>
    <li>
      <a href="#getting-started">🛠️ Getting Started</a>
      <ul>
        <li><a href="#nodejs">🌿 NodeJS</a></li>
        <li><a href="#web">🌐 Web Browsers (VanillaJS)</a></li>
      </ul>
    </li>
    <li><a href="#usage">✋ Usage</a></li>
    <li><a href="#cdn">📕 CDN</a></li>
    <li><a href="#exaples">🕹️ Code Examples</a></li>
    <li><a href="#docs">📖 Documentation</a></li>
    <li><a href="#api">📚 API</a></li>
    <li><a href="#license">📜 License</a></li>
    <li><a href="#contact">👋 Contact</a></li>
     <li><a href="#about-author">👤 About the Author</a></li>
  </ol>
</details>


<hr>

<br>
<h2 name="news">&bull; 📰 News</h2>

+ ✅ Added  support for __asyncronous__ ``lambda`` expressions.
<br>

<br>
<h2 name="about-the-project">&bull; 🔍 About The Project</h2>

**Luna** is a high-level programming language. It is designed to provide an elegant and productive coding experience for developers. Luna offers a clean and intuitive syntax, making it easier to write efficient and readable code. The language supports a variety of programming paradigms, including procedural, object-oriented, and functional programming styles. Luna is built with a focus on simplicity and productivity, aiming to streamline the development process and enhance developer experience. It provides powerful abstractions and built-in libraries to facilitate common programming tasks.

Luna is an interpreted programming language, which means that code written in Luna is executed directly by an interpreter rather than being compiled into machine code. Here's a high-level overview of how Luna works:

1. **Parsing**: When you write Luna code, the interpreter first parses it to understand its structure and syntax. This involves breaking the code into tokens and building an abstract syntax tree (AST) representation.

2. **Semantic Analysis**: After parsing, Luna performs semantic analysis. This phase involves analyzing the AST to enforce language rules and perform type checking. The interpreter verifies that the code follows the correct usage of variables, functions, and types, ensuring its correctness.

3. **Execution**: Once the code passes semantic analysis, the Luna interpreter begins executing the code line by line. It evaluates expressions, assigns values to variables, and executes control flow statements such as conditionals and loops. During execution, Luna can interact with input and output streams, read from files, and perform other operations as needed.

4. **Runtime Environment**: Luna provides a runtime environment that includes built-in functions, libraries, and data structures. Developers can utilize these features to perform common tasks without having to implement them from scratch.

Luna's interpreter handles the execution of code dynamically, allowing for flexibility and quick development cycles. This dynamic nature makes it suitable for scripting tasks and rapid prototyping. It also supports concurrency and asynchronous programming using mechanisms like coroutines or event-driven programming.

Overall, Luna aims to provide an elegant and productive programming experience, enabling developers to write clean and expressive code while leveraging the power of the underlying interpreter to execute their programs efficiently.
<h2 name="why-choose">&bull; 🤔 Why Luna?</h2>

**Most developers choose us because of the <u>Following Reasons:</u>**
+ Luna offers a clean and intuitive syntax that promotes readability and ease of understanding.
+ The language prioritizes simplicity and productivity, allowing developers to write code more efficiently.
+ Luna provides powerful abstractions and built-in libraries, reducing the need for extensive boilerplate code.
+ It supports multiple programming paradigms, including procedural, object-oriented, and functional programming.
+ Luna's focus on elegance and flexibility makes it an excellent choice for building a wide range of applications, from web development to system programming.
<br>
<h1 name="getting-started">&bull; 🛠️ Getting Started</h1>
<strong name="nodejs">
&nbsp;&nbsp;🌿 NodeJS <i>(for intellisence)</i> :
</strong>
<br><br>

 ```bash
npm install -g lunascript   #  COMING SOON...
```

<strong name="web">
&nbsp;&nbsp;🌐 Web
    <strong>&bull; JavaScript</strong>
</strong>
<br><br>

 ```js
import { luna } from 'lunascript';

let output = luna.run(luna_code);

console.log(output); // object {RuntimeValue}
```
<br>
<h1 name="examples">&bull; 🕹️ Code Examples</h1>

#### ✱ Functions in Luna:
```rust

fn read book {

  print("Reading {book}..."")
}

read("Luna Docs") # Reading Luna Docs...

```

#### ✱ Functions with default values:
```rust

fn sum x=(1) y=(1) {

  if x && y {
    x + y
  }

}

print(sum(2, 4)) # 6
```

#### ✱ Constant Definition:
```rust

# Defining a constant
pi: const = 3.141

fn area r {
  pi * r ** 2
}

print(area(2))

```

#### ✱ Reactivity in Luna:
```rust

# Reactivity

a = "foo"

b: react<a> = lambda {
  a.replace("o", '')
}

print(b) # "f"

a = "Hellooo" # // Reactivity... b's function got triggered

print(b) # "Hell"

```

#### ✱ Anonymous functions Assignment:
```rust

# User defined function:
fn sum x y {
  x + y
}

# Function assigned to variable
sum = fn sum x y {
  x + y
}

# Anonymous function:

a = lambda x y {
  x + y
}

```

#### ✱ Actions in Luna 🌙
```rust
# Note:
a = "foo"

# is same as:

a: var = "foo"

# Those are called Actions, and the variable's action is "var" by default...

# Constant:
a: const = 2.718

a = 2 # NameError: Assignment to constant variable 'a'.
```

#### ✱ Use-case of Luna's Reactivity feature:
```rust
# Reactivity

x = 1

doubled: react<x> = x * 2

x = 2

print(doubled)   // Output: `4`

```


#### ✱ Implementing Math in Luna:

$$e^x=\sum_{n=0}^{\infty}\frac{x^n}{n!}$$
```rust

# Taylor Series...

fn expo x {
  precision = 100
  result = 0

  n = 0
  while n < precision {

    result += x**n / factorial(n)

    n++
  }

  result
}

print(expo(0)) # 1

```

#### ✱ Implementing Luna's reactivity with Math:
$$\psi(x) = \frac{e^{2x}}{4x} + x^2 + 4x + 3!$$
```rust

x = 1

psi_x: react<x> = exp(2*x) / 4*x + x**2 + 4*x + factorial(3)

x = 2

print(doubled)   // Output: `4`

```

<br><br><br>

<h1 name="docs">📖 Documentation</h1>

You can check **Luna** documentation [here (GitHub)](https://github.com/rhpo/luna/tree/main/docs).

<br>
<h1 name="api">📚 API</h1>

You can check **Luna** *Application Programming Interface* (API) [here (GitHub)](https://github.com/rhpo/luna/tree/main/api).

<br>
<h1 name="license">📜 Licence (MIT)</h1>

*Copyright (c) 2022 Luna (https://www.github.com/rhpo/luna) Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:*

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

```THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.```

<br>
<h1 name="contact">👋 Contact:</h1>
    <p>&bull; Email &nbsp;&horbar;&nbsp; <a href="mailto:luna@ramey.ml">luna@ramey.ml</a></p>
    <p>&bull; Phone Number &nbsp;&horbar;&nbsp; <a href="tel:+213553238410">+213 553 23 84 10</a></p>
    <p>&bull; Discord &nbsp;&horbar;&nbsp; <a href="https://discord.gg/XXa7PpnMbq">(Luna  ―  High-level programming language)</a></p>
<br>
<h1 name="about-author">👤 About the author:</h1>
<ul>
    <p>&bull; Name &nbsp;&horbar;&nbsp; Ramy Hadid.</p>
    <p>&bull; Age &nbsp;&horbar;&nbsp; 18 years old.</p>
    <p>&bull; Nationality &nbsp;&horbar;&nbsp; 🇩🇿 Algeria.</p>
    <p>&bull; Linkedin &nbsp;&horbar;&nbsp; <a href="https://www.linkedin.com/in/ramy-hadid-15aa70243/">(Ramy Hadid)</a></p>
    <p>&bull; Instagram &nbsp;&horbar;&nbsp; <a href="https://www.linkedin.com/in/ramy-hadid-15aa70243/">@ramyhadid</a></p>
        <p>&bull; Discord &nbsp;&horbar;&nbsp; <a href="https://discord.com/users/751901651622690927">ramy#1539</a></p>
    <p>&bull; GitHub &nbsp;&horbar;&nbsp; <a href="https://www.github.com/rhpo">@rhpo</a></p>
    <p>&bull; Email (personal) &nbsp;&horbar;&nbsp; <a href="mailto:me@ramey.ml">me@ramey.ml</a></p>
    <p>&bull; Programming Languages &nbsp;&horbar;&nbsp; C# &bull; Ruby &bull; TypeScript &bull; Python &bull; LunaScript.</p>
</ul>

<br>

> Written by <a href="https://www.github.com/rhpo">@rhpo</a> with ❤️.

[contributors-shield]: https://img.shields.io/github/contributors/rhpo/luna?style=for-the-badge
[contributors-url]: https://github.com/rhpo/luna/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/rhpo/luna?style=for-the-badge
[forks-url]: https://github.com/rhpo/luna/network/members
[stars-shield]: https://img.shields.io/github/stars/rhpo/luna?style=for-the-badge
[stars-url]: https://github.com/rhpo/luna/stargazers
[issues-shield]: https://img.shields.io/github/issues/rhpo/luna?style=for-the-badge
[issues-url]: https://github.com/rhpo/luna/issues
[license-shield]: https://img.shields.io/github/license/rhpo/luna?style=for-the-badge
[license-url]: https://github.com/rhpo/luna/blob/master/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[discord-shield]: https://img.shields.io/discord/1006994262174478377?color=7289da&label=Discord&logo=discord&logoColor=white&style=for-the-badge
[discord-url]: https://discord.gg/XXa7PpnMbq
[linkedin-url]: https://www.linkedin.com/in/ramy-hadid-15aa70243/
