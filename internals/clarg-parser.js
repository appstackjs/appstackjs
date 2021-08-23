class Parser {
  #name;
  #explain;
  #tail_txt;

  #short;
  #long;
  #plain;

  #defaults;
  #options;

  #subparsers;

  constructor(name, opts) {
    this.#name = name;
    this.#explain = opts.explain || "";
    this.#tail_txt = opts.tail_txt || "";

    this.#short = {
      "-h": {
        option: false,
        attr: "help",
        value: true,
        default_: false,
        required: false,
        type: Boolean,
        help: "Display this message and exit"
      }
    };
    this.#long = {
      "--help": {
        option: false,
        attr: "help",
        value: true,
        default_: false,
        required: false,
        type: Boolean,
        help: "Display this message and exit"
      }
    };
    this.#plain = {};
    this.#defaults = {
      help: false
    };
    this.#options = [["h", "help"]];
    
    this.#subparsers = {};

    if (opts.help_command) {
      this.#subparsers.help = new Parser("help", {
        explain: "Display help information about a specific subcommand"
      }).option("command", {
        required: true,
        type: String
      });
    }
  }

  get name() {
    return this.#name;
  }

  get explain() {
    return this.#explain;
  }

  subparser(sp) {
    this.#subparsers[sp.name] = sp;

    return this;
  }

  option(short, long=null, opts) {
    let option, attr, value, default_, type, help, required;
    if (arguments.length === 1) {
      option = false; attr = null; value = null; default_ = null; type = String; help = ""; required = false;
    } else if (arguments.length === 2 && typeof long === "string") {
      option = false; attr = null; value = null; default_ = null; type = String; help = ""; required = false;
    } else {
      if (arguments.length === 3) {
        option = opts.option===undefined?false:opts.option;
        attr = opts.attr===undefined?null:opts.attr;
        value = opts.value===undefined?null:opts.value;
        default_ = opts.default_===undefined?null:opts.default_;
        type = opts.type===undefined?String:opts.type;
        help = opts.help===undefined?"":opts.help;
        required = opts.required===undefined?false:opts.required;
      } else {
        opts = long;
        option = opts.option===undefined?false:opts.option;
        attr = opts.attr===undefined?null:opts.attr;
        value = opts.value===undefined?null:opts.value;
        default_ = opts.default_===undefined?null:opts.default_;
        type = opts.type===undefined?String:opts.type;
        help = opts.help===undefined?"":opts.help;
        required = opts.required===undefined?false:opts.required;
        long = null;
      }
    }

    if (long !== null) {
      if (long.match(/^[-+]{2}[A-Za-z0-9][A-Za-z0-9-_]*$/) === null) {
        throw new Error("[clarg-parser] Long option variant does not match ^[-+]{2}[A-Za-z0-9][A-Za-z0-9-_]*$");
      }
    }
    
    if (required) help += " (required)";
    else if (option) help += " (default: " + String(default_) + ")";
    help = help.trim();

    if (short.match(/^[A-Za-z0-9_][A-Za-z0-9-_]*$/) !== null) {
      // Regular option
      if (attr === null) attr = short;
      this.#plain[short] = {
        option,
        attr,
        value,
        default_,
        type,
        help,
        required
      };
      
      if (!required) this.#defaults[attr] = default_;

      return this;
    } else if (short.match(/^[-+][A-Za-z0-9]$/) === null) {
      if (short.match(/^[-+]{2}[A-Za-z0-9][A-Za-z0-9-_]*$/) !== null && long === null) {
        long = short;
        short = null;
      } else {
        throw new Error("[clarg-parser] Short option variant does not match ^[-+][A-Za-z0-9]$");
      }
    }

    if (attr === null) {
      if (long !== null) {
        attr = long.substring(2).replace(/-/g, "_");
      } else {
        attr = short[1];
      }
    }

    if (option === false) {
      // Argument is a switch
      if (value === null) value = true;
      if (default_ === null) default_ = false;
      type = Boolean;
    }

    if (short !== null) {
      this.#short[short] = {
        option,
        attr,
        value,
        default_,
        type,
        help,
        required
      };
    }

    if (long !== null) {
      this.#long[long] = {
        option,
        attr,
        value,
        default_,
        type,
        help,
        required
      };
    }

    if (!required) this.#defaults[attr] = default_;
    this.#options.push([short || "", long || ""]);

    return this;
  }

  help(args_strings=[]) { return this.#help(args_strings); }
  #help(args_strings=[]) {
    args_strings = args_strings.map(x => " " + x);
    this.#options = this.#options.map(x => [x[0].replace(/^-*/, ""), x[1].replace(/^-*/, "")]);
    this.#options.sort((a, b)=>{
      if (a[0].length === 1 && b[0].length === 0) return a[0].charCodeAt(0) - b[1].charCodeAt(0);
      if (a[0].length === 0 && b[0].length === 1) return a[1].charCodeAt(0) - b[0].charCodeAt(0);
      if (a[0].length === 1 && b[0].length === 1)
        return a[0].charCodeAt(0) - b[0].charCodeAt(0);
      return [a[1], b[1]].sort()[0] === a[1] ? -1 : 1;
    });
    
    let line = "Usage:";
    let skip = line.length;
    args_strings.forEach(x=>skip+=x.length);

    //let args_strings = [];
    let list_strings = [];
    let max_length = 0;
    for (let i = 0; i < this.#options.length; ++i) {
      let x = "";
      let list_string = "";
      let context = {};
      if (this.#options[i][0].length !== 0) {
        x += "-" + this.#options[i][0];
        list_string += "-" + this.#options[i][0];
        context = this.#short["-" + this.#options[i][0]];
        if (this.#options[i][1].length !== 0) {
          x += "|";
          list_string += ", ";
        }
      } else {
        list_string += "    ";
      }
      if (this.#options[i][1].length !== 0) {
        x += "--" + this.#options[i][1];
        list_string += "--" + this.#options[i][1];
        context = this.#long["--" + this.#options[i][1]];
      }
      
      if (context.option === true) {
        x += "=X";
      }
      x += context.required?">":"]";
      if (context.required) x = " <" + x;
      else x = " [" + x;

      args_strings.push(x);
      if (max_length < list_string.length) max_length = list_string.length;
      list_string = [list_string, context.help];
      list_strings.push(list_string);
    }
    
    let plain_strings = [];
    let plain_max_length = 0;
    if (Object.keys(this.#subparsers).length === 0) {
      let requireds = [];
      let optionals = [];
      let requiredv = [];
      let optionalv = [];

      for (let plain in this.#plain) {
        if (this.#plain[plain].required) requireds.push(" <" + plain + ">");
        else optionals.push(" [" + plain + "]");

        if (this.#plain[plain].required) requiredv.push([plain, this.#plain[plain].help]);
        else optionalv.push([plain, this.#plain[plain].help]);
        if (plain_max_length < plain.length) plain_max_length = plain.length;
      }

      args_strings = [...args_strings, ...requireds, ...optionals];
      plain_strings = [...requiredv, ...optionalv];
    }
    
    let command_strings = [];
    let max_command_length = 0;
    for (let subcommand in this.#subparsers) {
      command_strings.push([subcommand, this.#subparsers[subcommand].explain]);
      if (subcommand.length > max_command_length) max_command_length = subcommand.length;
    }
    if (Object.keys(this.#subparsers).length !== 0) {
      args_strings.push(" <SUBCOMMAND>");
      args_strings.push(" [OPTIONS...]");
    }

    let message = "";

    for (let i = 0; i < args_strings.length; ++i) {
      if (line.length + args_strings[i].length <= 80) {
        line += args_strings[i]
      } else {
        message += line + "\n";
        line = " ".repeat(skip) + args_strings[i];
      }
    }
    message += line + "\n";

    if (this.#explain.length !== 0) {
      let explain = "";
      line = "   ";
      let tmp = this.#explain.split(" ");
      for (let i = 0; i < tmp.length; ++i) {
        if (tmp[i].length + line.length <= 80) {
          line += tmp[i] + (i + 1 === tmp.length?"":" ");
        } else {
          explain += line + "\n";
          line = "   " + tmp[i] + (i + 1 === tmp.length?"":" ");
        }
      }
      explain += line + "\n";

      message += "\n" + explain;
    }
    
    if (max_length !== 0) {
      message += "\nOptions:\n";
      for (let i = 0; i < list_strings.length; ++i) {

        let help = "";
        line = "  " + list_strings[i][0].padEnd(max_length, " ") + "  ";
        skip = line.length;
        let tmp = list_strings[i][1].split(" ");
        for (let j = 0; j < tmp.length; ++j) {
          if (tmp[j].length + line.length <= 80) {
            line += tmp[j] + (j + 1 === tmp.length?"":" ");
          } else {
            help += line + "\n";
            line = " ".repeat(skip) + tmp[j] + (j + 1 === tmp.length?"":" ");
          }
        }
        help += line + "\n";

        message += help;
      }
    }

    if (plain_strings.length !== 0) {
      message += "\nPositional Arguments:\n";
      for (let i = 0; i < plain_strings.length; ++i) {
        let help = "";
        line = "  " + plain_strings[i][0].padEnd(plain_max_length, " ") + "  ";
        skip = line.length;
        let tmp = plain_strings[i][1].split(" ");

        for (let j = 0; j < tmp.length; ++j) {
          if (tmp[j].length + line.length <= 80) {
            line += tmp[j] + (j + 1 === tmp.length?"":" ");
          } else {
            help += line + "\n";
            line = " ".repeat(skip) + tmp[j] + (j + 1 === tmp.length?"":" ");
          }
        }
        help += line + "\n";

        message += help;
      }
    }
    
    if (max_command_length !== 0) {
      message += "\nSubcommands:\n";
      for (let i = 0; i < command_strings.length; ++i) {

        let help = "";
        line = "  " + command_strings[i][0].padEnd(max_command_length, " ") + "  ";
        skip = line.length;
        let tmp = command_strings[i][1].split(" ");
        for (let j = 0; j < tmp.length; ++j) {
          if (tmp[j].length + line.length <= 80) {
            line += tmp[j] + (j + 1 === tmp.length?"":" ");
          } else {
            help += line + "\n";
            line = " ".repeat(skip) + tmp[j] + (j + 1 === tmp.length?"":" ");
          }
        }
        help += line + "\n";

        message += help;
      }
    }

    if (this.#tail_txt.length !== 0) {
      let tail = "";
      line = "";
      let tmp = this.#tail_txt.split(" ");
      for (let i = 0; i < tmp.length; ++i) {
        if (tmp[i].length + line.length <= 80) {
          line += tmp[i] + (i + 1 === tmp.length?"":" ");
        } else {
          tail += line + "\n";
          line = "" + tmp[i] + (i + 1 === tmp.length?"":" ");
        }
      }
      tail += line + "\n";

      message += "\n" + tail;
    }

    console.log(message);
  }

  run(argv, depth=1, skip=1) {
    let res = JSON.parse(JSON.stringify(this.#defaults));
    let err = [];

    let i = skip;
    let positional_pointer = 0;
    let requiredp = [];
    let optionalp = [];
    for (let plain in this.#plain) {
      if (this.#plain[plain].required) requiredp.push(plain);
      else optionalp.push(plain);
    }
    let plains = [...requiredp, ...optionalp];

    for (; i < argv.length; ++i) {
      let split = argv[i].split('=');
      
      if (split[0] === "--") {
        ++i;
        break;
      } else {
        if (split[0][0] === '-' && split[0][1] !== '-') {
          // short
          if (this.#short[split[0]]) {
            if (this.#short[split[0]].option) {
              let value = split.slice(1).join('=');
              if (split.length === 1) {
                value = argv[++i];
                if (value === undefined) {
                  err.push("unexpected end of arguments");
                }
              }

              res[this.#short[split[0]].attr] = this.#short[split[0]].type(value);
            } else {
              res[this.#short[split[0]].attr] = this.#short[split[0]].value;
            }
          } else {
            err.push(`no such option '${split[0]}'`);
            continue;
          }
        } else if (split[0][0] === '-' && split[0][1] === '-') {
          // long
          if (this.#long[split[0]]) {
            if (this.#long[split[0]].option) {
              let value = split.slice(1).join('=');
              if (split.length === 1) {
                value = argv[++i];
                if (value === undefined) {
                  err.push("unexpected end of arguments");
                }
              }

              res[this.#long[split[0]].attr] = this.#long[split[0]].type(value);
            } else {
              res[this.#long[split[0]].attr] = this.#long[split[0]].value;
            }
          } else {
            err.push(`no such option '${split[0]}'`);
            continue;
          }
        } else {
          if (this.#subparsers[split[0]]) {
            res.__subparse = split[0];
            let tmp = this.#subparsers[split[0]].run(argv, depth+1, i+1);

            res.__subopt = tmp.options;
            err = [...err, ...tmp.errors];
            i = tmp.leftover;

            if (split[0] === "help") {
              // Act on the "help" subcommand
              this.#subparsers[tmp.options.command].help(["subcommand:" + tmp.options.command]);
              process.exit(0);
            }
            break;
          } else if (positional_pointer < plains.length) {
            res[this.#plain[plains[positional_pointer]].attr] = argv[i];
            
            ++positional_pointer;
          } else {
            err.push(`unexpected non-option '${split[0]}'`);
            continue;
          }
        }
      }
    }

    if (err.length === 0 && res.help) {
      this.#help(argv.slice(0, skip));
      process.exit(0);
    }

    return { options: res, errors: err, argv, leftover: i };
  }
}

module.exports = Parser;

