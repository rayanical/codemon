// Source and inputs are JSON-encoded data, never interpolated as Python syntax.
export function buildRunner(code, functionName, tests, token) {
  const payload = JSON.stringify({ code, functionName, tests });
  return `
import json as _json, io as _io, contextlib as _contextlib, time as _time, traceback as _traceback, copy as _copy, builtins as _builtins

def _codemon_run(_payload, _token):
    _data = _json.loads(_payload)
    _results = []
    for _case in _data['tests']:
        _out = _io.StringIO()
        _start = _time.perf_counter()
        _result = {'id': _case['id'], 'passed': False}
        try:
            _scope = {'__builtins__': dict(vars(_builtins)), '__name__': '__solution__'}
            with _contextlib.redirect_stdout(_out), _contextlib.redirect_stderr(_out):
                exec(compile(_data['code'], 'solution.py', 'exec'), _scope)
                _fn = _scope.get(_data['functionName'])
                if not callable(_fn):
                    raise TypeError('Define a function named ' + _data['functionName'])
                _actual = _fn(*_copy.deepcopy(_case['args']))
                _encoded = _json.dumps(_actual, allow_nan=False)
                _result['actual'] = _json.loads(_encoded)
                _result['passed'] = _actual == _case['expected']
                _result['actualRepr'] = repr(_actual)
                _result['actualType'] = type(_actual).__name__
                if not _case.get('hidden', False):
                    _result['expectedRepr'] = repr(_case['expected'])
                    _result['expectedType'] = type(_case['expected']).__name__
        except BaseException:
            _result['error'] = _traceback.format_exc(limit=4)
        _result['stdout'] = _out.getvalue()[:12000]
        _result['duration'] = round((_time.perf_counter() - _start) * 1000, 2)
        _results.append(_result)
    print(_token + _json.dumps(_results, allow_nan=False))

_codemon_run(${JSON.stringify(payload)}, ${JSON.stringify(token)})
`;
}
export function parseResults(stdout, token) {
  const line = stdout.split("\n").find((line) => line.startsWith(token));
  if (!line) return null;
  try {
    return JSON.parse(line.slice(token.length));
  } catch {
    return null;
  }
}
