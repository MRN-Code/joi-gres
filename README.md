# joi-gres
Schema generator for joi and postrgres

## Usage

    joi-gres ( -c config_file | -s con_string | username:password@server/db_name ) [-PpdUu] <table_name>...

#### Options:
  * -c  Specify configuration file
  * -s  Specify pg connection string
  * -P  Specify password
  * -p  Specify port
  * -d  Specify db_name
  * -U  Specify username
  * -u  Specify url

####

##
  
## Configuration File Format

```
{
    username: "\<username\>",
    password: "\<password\>",
    url:      "\<url\>",
    db_name:  "\<db_name\>",
    port:     "\<port\>"
}
```

##

#

