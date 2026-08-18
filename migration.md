# Migration

The keybinds stored by the react app no longer unmarshal into the new
`[]string` schema. Run this on the production db to replace the keybinds of
every account with the new default:

```sql
UPDATE users
SET settings = json_set(
      settings,
      '$.keybinds',
      json('{"straight":["space","c"],"yambic_left":["z"],"yambic_right":["x"],"transmit":["w"],"cancel_message":["p"]}')
    )
WHERE json_valid(settings);
```
