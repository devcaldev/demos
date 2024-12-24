class Event
  class JsonType < ActiveModel::Type::Value
    def type
      :json
    end
  
    def cast_value(value)
      case value
      when String
        ActiveSupport::JSON.decode(value) rescue nil
      else
        value
      end
    end

    def serialize(value)
      case value
      when String
        super
      else
        ActiveSupport::JSON.encode(value)
      end
    end
  
    def changed_in_place?(raw_old_value, new_value)
      cast_value(raw_old_value) != new_value
    end
  end

  include ActiveModel::Model
  include ActiveModel::Attributes
  attribute :user_id, :integer
  attribute :id, :string
  attribute :dtstart, :time
  attribute :dtend, :time
  attribute :rrule, :string
  attribute :props, JsonType.new

  validates_presence_of :user_id, :dtstart, :dtend

  def self.where(list_params)
    DEVCAL.list_events(**list_params).to_a.map{ |de| Event.from_devcal(de) }
  end

  def self.find(id)
    Event.from_devcal(DEVCAL.get_event(ID: id))
  end

  def self.from_devcal(devcal_event)
    props = devcal_event.Props.to_h.deep_stringify_keys
    user_id = props.delete('user_id')
    Event.new(user_id: user_id, id: devcal_event.ID, dtstart: devcal_event.Dtstart.to_time, dtend: devcal_event.Dtend.to_time, props: props)
  end

  def persisted?
    id.present?
  end

  def save
    return unless valid?
    persisted? ? update : insert
  end

  def destroy
    DEVCAL.delete_event(ID: id)
    self.id = nil
  end

  def destroy!
    destroy
  end

  private

  def insert
    devcal_event = DEVCAL.insert_event(Dtstart: dtstart.to_time, Dtend: dtend.to_time, Rrule: rrule, Props: devcal_props)
    self.id = devcal_event.ID
  end

  def update
    DEVCAL.update_event(ID: id, Dtstart: dtstart.to_time, Dtend: dtend.to_time, Rrule: rrule, Props: devcal_props)
  end

  def devcal_props
    (props || {}).merge(user_id: user_id).deep_stringify_keys
  end
end
