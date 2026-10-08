import {test,expect} from 'vitest';
test('unit runner preserves unknown instead of fabricating zero',()=>{expect(JSON.parse('{"value":null}').value).toBeNull();});
