require 'devcal'

addr = ENV.fetch('DEVCAL_ADDR', 'devcal.fly.dev:50051')
api_key = ENV.fetch('DEVCAL_API_KEY', '')

DEVCAL = Devcal.new_with_credentials(addr, api_key)
